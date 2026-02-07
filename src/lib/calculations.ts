import { formatUnits } from "viem";

/**
 * Calculate market metrics from raw Morpho market state data.
 */
export function calculateMarketMetrics(
  marketState: readonly bigint[] | null
) {
  if (!marketState || marketState.length < 3) {
    return {
      borrowedFunds: 0,
      marketLiquidity: 0,
      totalMarketSize: 0,
      totalLiquidity: 0,
      utilization: "0.00%",
    };
  }

  const borrowedFunds = Number(marketState[2]) / 1e6;
  const marketLiquidity =
    Number(marketState[0] - marketState[2]) / 1e6;
  const totalMarketSize = borrowedFunds + marketLiquidity;
  const totalLiquidity = marketLiquidity;

  const utilization =
    Number(marketState[0]) > 0
      ? `${((Number(marketState[2]) / Number(marketState[0])) * 100).toFixed(2)}%`
      : "0.00%";

  return {
    borrowedFunds,
    marketLiquidity,
    totalMarketSize,
    totalLiquidity,
    utilization,
  };
}

/**
 * Parse user position from raw Morpho contract data.
 */
export function parseUserPosition(
  position: readonly bigint[] | null,
  marketState: readonly bigint[] | null
) {
  if (!position || position.length < 3) {
    return { userCollateral: 0, userBorrow: 0 };
  }

  const userCollateral = Number(position[2]) / 1e6;

  const userBorrow =
    marketState &&
    marketState.length >= 4 &&
    Number(marketState[3]) > 0
      ? (Number(position[1]) * Number(marketState[2])) /
        Number(marketState[3]) /
        1e6
      : 0;

  return { userCollateral, userBorrow };
}

/**
 * Parse LLTV (Liquidation Loan-to-Value) from market params.
 */
export function parseLLTV(
  marketParams: readonly unknown[] | null
): number {
  if (!marketParams || marketParams.length < 5) {
    return 0;
  }
  return (Number(marketParams[4]) / 1e18) * 100;
}

/**
 * Calculate borrow assets from shares.
 */
export function calculateBorrowAssets(
  borrowShares: bigint | number,
  totalBorrowAssets: bigint | number,
  totalBorrowShares: bigint | number
): number {
  const shares = Number(borrowShares);
  const assets = Number(totalBorrowAssets);
  const totalShares = Number(totalBorrowShares);

  if (totalShares === 0 || shares === 0) return 0;

  return (shares * assets) / totalShares / 1e6;
}

/**
 * Compute position risk metrics from pre-parsed values.
 */
export function computePositionMetrics(
  userCollateral: number,
  userBorrow: number,
  oraclePrice: number,
  lltv: number
) {
  const currentLTV =
    userCollateral > 0 && oraclePrice > 0
      ? (userBorrow / (userCollateral * oraclePrice)) * 100
      : 0;

  const maxWithdrawable =
    userBorrow > 0 && oraclePrice > 0 && lltv > 0
      ? Math.max(
          0,
          userCollateral - userBorrow / (oraclePrice * (lltv / 100))
        )
      : userCollateral;

  const liquidationPrice =
    userCollateral > 0 && lltv > 0
      ? userBorrow / (userCollateral * (lltv / 100))
      : 0;

  const percentDropToLiquidation =
    oraclePrice > 0 && liquidationPrice > 0
      ? ((oraclePrice - liquidationPrice) / oraclePrice) * 100
      : 0;

  return {
    currentLTV,
    maxWithdrawable,
    liquidationPrice,
    percentDropToLiquidation,
  };
}

/**
 * Format raw bigint balance to human-readable string.
 */
export function formatBalance(raw: bigint, decimals: number): string {
  return formatUnits(raw, decimals);
}
