import { NextRequest, NextResponse } from "next/server";
import { getLatestPythPrice } from "@/lib/blockchain/utils";
import { APP_CONFIG } from "@/constants/config";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/prices
 * Returns current Pyth oracle prices for XAUt and USDT.
 * Public endpoint - rate limited by IP.
 */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limited = rateLimit(`prices:${ip}`, 30, 60_000); // 30 req/min per IP
  if (limited) return limited;

  try {
    const [XAUt, USDT] = await Promise.all([
      getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.XAUt),
      getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.USDT),
    ]);

    return NextResponse.json({
      XAUt,
      USDT,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Prices fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
