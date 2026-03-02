import { NextRequest, NextResponse } from "next/server";
import {
  getMorphoMarketParams,
  getMorphoMarketState,
  getBorrowRate,
  getOraclePrice,
} from "@/lib/blockchain/utils";
import { MARKET_ID } from "@/constants/addresses";
import { calculateMarketMetrics, parseLLTV } from "@/lib/calculations";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/market
 * Returns consolidated market data (metrics, rates, oracle price, LLTV).
 * Public endpoint - rate limited by IP.
 */
export async function GET(request: NextRequest) {
  // Rate limit by IP to prevent abuse of on-chain RPC calls
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limited = rateLimit(`market:${ip}`, 30, 60_000); // 30 req/min per IP
  if (limited) return limited;

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
