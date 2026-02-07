import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import {
  validateBorrowParams,
  buildBorrowActionCalls,
  buildSupplyAndBorrowCalls,
  buildRepayAndWithdrawCalls,
  BorrowAction,
} from "@/services/api/borrow.service";
import { getMorphoMarketParams, getMorphoUserPosition } from "@/lib/blockchain/utils";
import { AAService, bigIntReplacer } from "@/services/account-abstraction";
import { MorphoMarketParamsRaw } from "@/types";
import { MARKET_ID } from "@/constants/addresses";
import { verifyAuth } from "@/lib/auth";

/**
 * POST /api/borrow/prepare
 * Builds borrow/supply/repay/withdraw UserOp server-side.
 *
 * Request body:
 * {
 *   action: 'supply' | 'borrow' | 'repay' | 'withdraw',
 *   amount: string,
 *   max?: boolean,
 *   userAddress: Address,
 *   // For combined actions:
 *   supplyAmount?: string,
 *   borrowAmount?: string,
 *   repayAmount?: string,
 *   withdrawAmount?: string,
 *   repayMax?: boolean,
 *   withdrawMax?: boolean
 * }
 *
 * Response:
 * { unsignedUserOp } OR { error }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const {
      action,
      amount,
      max,
      userAddress,
      // Combined action fields
      supplyAmount,
      borrowAmount,
      repayAmount,
      withdrawAmount,
      repayMax,
      withdrawMax,
    } = body;

    // Validate user address
    if (!userAddress) {
      return NextResponse.json(
        { error: "Missing user address" },
        { status: 400 }
      );
    }

    // Fetch market params and user position
    const [marketParams, userPosition] = await Promise.all([
      getMorphoMarketParams(MARKET_ID),
      getMorphoUserPosition(userAddress as Address, MARKET_ID),
    ]);

    if (!marketParams) {
      return NextResponse.json(
        { error: "Failed to fetch market parameters" },
        { status: 500 }
      );
    }

    const typedMarketParams = marketParams as unknown as MorphoMarketParamsRaw;
    const typedPosition = userPosition as readonly bigint[] | null;

    let calls;

    // Handle combined actions (supply+borrow or repay+withdraw)
    if (supplyAmount || borrowAmount) {
      // Supply and/or Borrow mode
      calls = buildSupplyAndBorrowCalls(
        supplyAmount || "0",
        borrowAmount || "0",
        typedMarketParams,
        userAddress as Address
      );
    } else if (repayAmount || withdrawAmount) {
      // Repay and/or Withdraw mode
      calls = buildRepayAndWithdrawCalls(
        repayAmount || "0",
        withdrawAmount || "0",
        typedMarketParams,
        userAddress as Address,
        repayMax,
        withdrawMax,
        typedPosition
      );
    } else if (action && amount) {
      // Single action mode
      const validation = validateBorrowParams({
        action: action as BorrowAction,
        amount,
        max,
        marketParams: typedMarketParams,
        userAddress: userAddress as Address,
        userPosition: typedPosition,
      });

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      const result = buildBorrowActionCalls({
        action: action as BorrowAction,
        amount,
        max,
        marketParams: typedMarketParams,
        userAddress: userAddress as Address,
        userPosition: typedPosition,
      });

      calls = result.calls;
    } else {
      return NextResponse.json(
        { error: "Missing action and amount" },
        { status: 400 }
      );
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json(
        { error: "No actions to execute" },
        { status: 400 }
      );
    }

    // Prepare UserOp (without authorization - user will sign)
    const userOp = await AAService.prepare(userAddress as Address, calls);

    // Serialize UserOp for JSON response
    const serializedUserOp = JSON.parse(JSON.stringify(userOp, bigIntReplacer));

    return NextResponse.json({
      unsignedUserOp: serializedUserOp,
    });
  } catch (error: unknown) {
    console.error("Borrow prepare error:", error);
    const message = error instanceof Error ? error.message : "Failed to prepare borrow action";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
