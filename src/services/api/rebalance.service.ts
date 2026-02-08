import { Address, formatUnits, Call } from "viem";
import {
  getMorphoMarketData,
  getOraclePrice,
} from "@/lib/blockchain/utils";
import {
  parseUserPosition,
  parseLLTV,
  computePositionMetrics,
} from "@/lib/calculations";
import { buildWithdrawCalls, buildRepayCalls } from "@/services/api/borrow.service";
import { buildSwapCallsWithQuote, SwapParams } from "@/services/api/swap.service";
import { XAUT0, USDT0 } from "@/constants/addresses";
import { MorphoMarketParamsRaw } from "@/types";

// ─── Constants (calibrated to XAUt0/USDT0 Morpho market on Arbitrum) ────
//
// Market reality (live data):
//   LLTV: 77%  — liquidation happens at 77% LTV
//   Oracle price: ~$4,970/XAUt
//   Borrow rate: ~3.86% APR
//   Utilization: ~82%
//
// Rebalance strategy:
//   Trigger at 60% LTV (17% buffer before 77% liquidation)
//   Withdraw 50% of maxWithdrawable → swap → repay
//   This brings LTV down significantly each run

/** Default fraction of maxWithdrawable to use (50%) */
const DEFAULT_WITHDRAW_FRACTION = 0.5;

/** Slippage for automated rebalancing swaps (2%) */
const REBALANCE_SLIPPAGE = "2.0";

/** Deadline for swap execution (5 minutes) */
const REBALANCE_DEADLINE = "5";

/** Minimum collateral to consider rebalancing (human-readable XAUT, ~$0.05 at $4970) */
const MIN_COLLATERAL = 0.00001;

/** Minimum borrow to consider rebalancing (human-readable USDT) */
const MIN_BORROW = 0.01;

/** Minimum withdrawal amount (human-readable XAUT, ~$0.005 at $4970) */
const MIN_WITHDRAW_AMOUNT = 0.000001;

/** Maximum USDT value per rebalance (under the 1000 offline execution limit) */
const MAX_REBALANCE_USDT = 900;

// ─── Types ──────────────────────────────────────────────────────

export interface RebalanceCalculation {
  withdrawAmountXAUT: number;
  estimatedUSDTOut: number;
  currentLTV: number;
  estimatedNewLTV: number;
  currentCollateral: number;
  currentBorrow: number;
  oraclePrice: number;
  maxWithdrawable: number;
}

export interface RebalanceResult {
  calls: Call[];
  calculation: RebalanceCalculation;
}

// ─── Pure Calculation ───────────────────────────────────────────

/**
 * Calculates the optimal withdrawal amount for rebalancing.
 * Uses a fraction of maxWithdrawable (default 50%).
 */
export function calculateRebalanceAmount(
  userCollateral: number,
  userBorrow: number,
  oraclePrice: number,
  _lltv: number,
  maxWithdrawable: number,
  withdrawFraction: number = DEFAULT_WITHDRAW_FRACTION,
): { withdrawAmount: number; error?: string } {
  if (userCollateral < MIN_COLLATERAL) {
    return { withdrawAmount: 0, error: "Collateral too small to rebalance" };
  }
  if (userBorrow < MIN_BORROW) {
    return { withdrawAmount: 0, error: "Borrow too small to rebalance" };
  }
  if (maxWithdrawable < MIN_WITHDRAW_AMOUNT) {
    return { withdrawAmount: 0, error: "No safe withdrawal room available" };
  }

  // Use fraction of maxWithdrawable with 1% safety margin
  const safeMax = maxWithdrawable * 0.99;
  let withdrawAmount = safeMax * withdrawFraction;

  if (withdrawAmount < MIN_WITHDRAW_AMOUNT) {
    return { withdrawAmount: 0, error: "Calculated withdrawal too small" };
  }

  // Cap at max USDT equivalent
  const estimatedUSDT = withdrawAmount * oraclePrice;
  if (estimatedUSDT > MAX_REBALANCE_USDT) {
    withdrawAmount = MAX_REBALANCE_USDT / oraclePrice;
  }

  return { withdrawAmount };
}

// ─── Orchestrator ───────────────────────────────────────────────

/**
 * Builds the full rebalance Call[] array:
 * 1. Withdraw XAUT collateral from Morpho
 * 2. Approve XAUT for Uniswap + swap XAUT → USDT
 * 3. Approve USDT for Morpho + repay debt
 */
export async function buildRebalanceCalls(
  userAddress: Address,
  withdrawFraction?: number,
): Promise<RebalanceResult> {
  // 1. Fetch all market data
  const { params: marketParams, state, position } = await getMorphoMarketData(userAddress);

  if (!marketParams || !state || !position) {
    throw new Error("Failed to fetch market data");
  }

  const posArr = position as unknown as readonly bigint[];
  const stateArr = state as unknown as readonly bigint[];
  const paramsArr = marketParams as unknown as readonly unknown[];
  const typedMarketParams = marketParams as unknown as MorphoMarketParamsRaw;

  const { userCollateral, userBorrow } = parseUserPosition(posArr, stateArr);
  const lltv = parseLLTV(paramsArr);
  const oraclePrice = await getOraclePrice(marketParams);

  const { maxWithdrawable, currentLTV } = computePositionMetrics(
    userCollateral, userBorrow, oraclePrice, lltv
  );

  // 2. Calculate withdrawal amount
  const { withdrawAmount, error } = calculateRebalanceAmount(
    userCollateral, userBorrow, oraclePrice, lltv,
    maxWithdrawable, withdrawFraction,
  );

  if (error || withdrawAmount <= 0) {
    throw new Error(error || "Cannot calculate rebalance amount");
  }

  const withdrawAmountStr = withdrawAmount.toFixed(6);

  // 3. Build withdraw calls (1 call)
  const withdrawCalls = buildWithdrawCalls(
    withdrawAmountStr, typedMarketParams, userAddress
  );

  // 4. Build swap calls: XAUT → USDT (2 calls: approve + swap)
  const swapParams: SwapParams = {
    tokenIn: XAUT0 as Address,
    tokenOut: USDT0 as Address,
    amountIn: withdrawAmountStr,
    decimalsIn: 6,
    decimalsOut: 6,
    slippage: REBALANCE_SLIPPAGE,
    deadline: REBALANCE_DEADLINE,
    recipient: userAddress,
  };

  const swapResult = await buildSwapCallsWithQuote(swapParams);

  // 5. Build repay calls using amountOutMinimum (2 calls: approve + repay)
  const repayAmountStr = formatUnits(swapResult.amountOutMinimum, 6);
  const repayCalls = buildRepayCalls(
    repayAmountStr, typedMarketParams, userAddress
  );

  // 6. Concatenate: withdraw → swap → repay
  const calls: Call[] = [
    ...withdrawCalls,
    ...swapResult.calls,
    ...repayCalls,
  ];

  // Estimate new position metrics
  const estimatedUSDTOut = Number(swapResult.quote.amountOut);
  const newCollateral = userCollateral - withdrawAmount;
  const newBorrow = userBorrow - estimatedUSDTOut;
  const estimatedNewLTV = newCollateral > 0 && oraclePrice > 0
    ? (newBorrow / (newCollateral * oraclePrice)) * 100
    : 0;

  return {
    calls,
    calculation: {
      withdrawAmountXAUT: withdrawAmount,
      estimatedUSDTOut,
      currentLTV,
      estimatedNewLTV,
      currentCollateral: userCollateral,
      currentBorrow: userBorrow,
      oraclePrice,
      maxWithdrawable,
    },
  };
}
