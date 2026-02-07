import { NextResponse } from "next/server";
import { getLatestPythPrice } from "@/lib/blockchain/utils";
import { APP_CONFIG } from "@/constants/config";

/**
 * GET /api/prices
 * Returns current Pyth oracle prices for XAUt0 and USDT0.
 * Public endpoint - no auth required.
 */
export async function GET() {
  try {
    const [XAUt0, USDT0] = await Promise.all([
      getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.XAUt0),
      getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.USDT0),
    ]);

    return NextResponse.json({
      XAUt0,
      USDT0,
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
