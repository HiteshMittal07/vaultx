import { NextResponse } from "next/server";
import {
  getMorphoMarketParams,
  getMorphoMarketState,
  getBorrowRate,
  getOraclePrice,
} from "@/lib/blockchain/utils";
import { MARKET_ID } from "@/constants/addresses";
import { calculateMarketMetrics, parseLLTV } from "@/lib/calculations";

/**
 * GET /api/market
 * Returns consolidated market data (metrics, rates, oracle price, LLTV).
 * Public endpoint - no auth required.
 */
export async function GET() {
  try {
    const [params, state] = await Promise.all([
      getMorphoMarketParams(MARKET_ID),
      getMorphoMarketState(MARKET_ID),
    ]);

    if (!params || !state) {
      return NextResponse.json(
        { error: "Failed to fetch market data" },
        { status: 500 }
      );
    }

    const [borrowRate, oraclePrice] = await Promise.all([
      getBorrowRate(params, state),
      getOraclePrice(params),
    ]);

    const metrics = calculateMarketMetrics(state as readonly bigint[]);
    const lltv = parseLLTV(params as readonly unknown[]);

    return NextResponse.json({
      totalMarketSize: metrics.totalMarketSize,
      totalLiquidity: metrics.totalLiquidity,
      borrowedFunds: metrics.borrowedFunds,
      utilization: metrics.utilization,
      borrowRate,
      oraclePrice,
      lltv,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Market data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
