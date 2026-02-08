import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { executeOffline } from "@/services/account-abstraction/offline.service";
import {
  buildSupplyAndBorrowCalls,
  buildRepayAndWithdrawCalls,
  buildBorrowActionCalls,
  validateBorrowParams,
  BorrowAction,
} from "@/services/api/borrow.service";
import {
  buildSwapCallsWithQuote,
  validateSwapParams,
  SwapParams,
} from "@/services/api/swap.service";
import {
  getMorphoMarketParams,
  getMorphoUserPosition,
} from "@/lib/blockchain/utils";
import { MorphoMarketParamsRaw } from "@/types";
import { MARKET_ID } from "@/constants/addresses";
import { getDb } from "@/lib/mongodb";
import { validateCallsAgainstPolicy } from "@/services/api/policy.service";
import { verifyInternalKey } from "@/lib/auth";
import { ExecuteOfflineSchema, formatZodError } from "@/lib/validation";
import { audit } from "@/lib/audit";

/** Maximum allowed amount per offline transaction (application-level limit). */
const MAX_AMOUNT_PER_TX = 1000;

/**
 * POST /api/aa/execute-offline
 *
 * Executes a transaction on behalf of a user while they are offline.
 * Internal-only endpoint (no external auth required).
 *
 * Request body:
 * {
 *   type: 'borrow' | 'swap',
 *   userAddress: '0x...',
 *   params: { ... action-specific params ... }
 * }
 *
 * Response:
 * { txHash, userOpHash } OR { error }
 */
export async function POST(request: NextRequest) {
  // Internal-only endpoint — require API key
  const authError = verifyInternalKey(request);
  if (authError) {
    audit({ event: "auth_failure", details: { endpoint: "/api/aa/execute-offline" } });
    return authError;
  }

  try {
    const body = await request.json();

    const parsed = ExecuteOfflineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { type, userAddress, params } = parsed.data;

    let calls;

    if (type === "borrow") {
      calls = await buildBorrowCalls(userAddress as Address, params);
    } else if (type === "swap") {
      calls = await buildSwapCalls(userAddress as Address, params);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json(
        { error: "No actions to execute" },
        { status: 400 }
      );
    }

    // Validate calls against backend policy (contract allowlist, selectors, values)
    const policyCheck = validateCallsAgainstPolicy(calls);
    if (!policyCheck.valid) {
      audit({ event: "policy_violation", userAddress, action: type, details: { error: policyCheck.error } });
      return NextResponse.json(
        { error: `Policy violation: ${policyCheck.error}` },
        { status: 403 }
      );
    }

    // Execute offline (prepare + sign via Privy + relay)
    const { txHash, userOpHash } = await executeOffline(
      userAddress as Address,
      calls
    );

    // Save transaction history to MongoDB
    try {
      const db = await getDb();
      const historyEntry: Record<string, unknown> = {
        walletAddress: (userAddress as string).toLowerCase(),
        txHash,
        executedBy: "vaultx-agent",
        status: "success",
        timestamp: new Date(),
      };

      if (type === "swap") {
        historyEntry.action = "swap";
        historyEntry.tokenIn = params.tokenIn;
        historyEntry.tokenOut = params.tokenOut;
        historyEntry.amountIn = params.amountIn;
        historyEntry.amountOut = params.amountOut;
      } else if (type === "borrow") {
        // Determine specific action from params
        const { action, supplyAmount, borrowAmount, repayAmount, withdrawAmount } = params;
        if (action) {
          historyEntry.action = action;
        } else if (repayAmount || withdrawAmount) {
          historyEntry.action = withdrawAmount && Number(withdrawAmount) > 0 ? "withdraw" : "repay";
        } else if (supplyAmount || borrowAmount) {
          historyEntry.action = borrowAmount && Number(borrowAmount) > 0 ? "borrow" : "supply";
        }
        historyEntry.supply = supplyAmount;
        historyEntry.borrow = borrowAmount;
        historyEntry.repay = repayAmount;
        historyEntry.withdraw = withdrawAmount;
      }

      await db.collection("transaction_history").insertOne(historyEntry);
    } catch (historyError) {
      console.error("[API] Failed to save offline history:", historyError);
    }

    audit({ event: "offline_execution", userAddress, action: type, details: { txHash } });

    return NextResponse.json({ txHash, userOpHash });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Offline execution failed";
    audit({ event: "offline_execution_failed", details: { error: message } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Builds borrow/supply/repay/withdraw calls with spend limit validation.
 */
async function buildBorrowCalls(userAddress: Address, params: any) {
  const {
    action,
    amount,
    max,
    supplyAmount,
    borrowAmount,
    repayAmount,
    withdrawAmount,
    repayMax,
    withdrawMax,
  } = params;

  // Application-level spend limit
  const amounts = [supplyAmount, borrowAmount, repayAmount, withdrawAmount, amount].filter(Boolean);
  for (const amt of amounts) {
    if (Number(amt) > MAX_AMOUNT_PER_TX) {
      throw new Error(
        `Amount ${amt} exceeds maximum of ${MAX_AMOUNT_PER_TX} per transaction`
      );
    }
  }

  const [marketParams, userPosition] = await Promise.all([
    getMorphoMarketParams(MARKET_ID),
    getMorphoUserPosition(userAddress, MARKET_ID),
  ]);

  if (!marketParams) {
    throw new Error("Failed to fetch market parameters");
  }

  const typedMarketParams = marketParams as unknown as MorphoMarketParamsRaw;
  const typedPosition = userPosition as readonly bigint[] | null;

  // Handle combined actions (supply+borrow or repay+withdraw)
  if (supplyAmount || borrowAmount) {
    return buildSupplyAndBorrowCalls(
      supplyAmount || "0",
      borrowAmount || "0",
      typedMarketParams,
      userAddress
    );
  } else if (repayAmount || withdrawAmount) {
    return buildRepayAndWithdrawCalls(
      repayAmount || "0",
      withdrawAmount || "0",
      typedMarketParams,
      userAddress,
      repayMax,
      withdrawMax,
      typedPosition
    );
  } else if (action && amount) {
    const validation = validateBorrowParams({
      action: action as BorrowAction,
      amount,
      max,
      marketParams: typedMarketParams,
      userAddress,
      userPosition: typedPosition,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const result = buildBorrowActionCalls({
      action: action as BorrowAction,
      amount,
      max,
      marketParams: typedMarketParams,
      userAddress,
      userPosition: typedPosition,
    });

    return result.calls;
  }

  throw new Error("Missing borrow action parameters");
}

/**
 * Builds swap calls with spend limit validation.
 */
async function buildSwapCalls(userAddress: Address, params: any) {
  const { amountIn } = params;

  // Application-level spend limit
  if (Number(amountIn) > MAX_AMOUNT_PER_TX) {
    throw new Error(
      `Amount ${amountIn} exceeds maximum of ${MAX_AMOUNT_PER_TX} per transaction`
    );
  }

  const swapParams: SwapParams = {
    ...params,
    recipient: userAddress,
  };

  const validation = validateSwapParams(swapParams);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const result = await buildSwapCallsWithQuote(swapParams);
  return result.calls;
}
