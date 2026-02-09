import { NextResponse } from "next/server";
import { getLatestPythPrice } from "@/lib/blockchain/utils";
import { APP_CONFIG } from "@/constants/config";

/**
 * GET /api/prices
 * Returns current Pyth oracle prices for XAUt and USDT.
 * Public endpoint - no auth required.
 */
export async function GET() {
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
