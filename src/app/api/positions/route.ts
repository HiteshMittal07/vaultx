import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { getMorphoMarketData, getOraclePrice } from "@/lib/blockchain/utils";
import { verifyAuth } from "@/lib/auth";
import {
  parseUserPosition,
  parseLLTV,
  computePositionMetrics,
} from "@/lib/calculations";

/**
 * GET /api/positions?address=0x...
 * Returns user's Morpho position with pre-computed metrics.
 * Requires auth.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const address = request.nextUrl.searchParams.get("address");
    if (!address) {
      return NextResponse.json(
        { error: "Missing address parameter" },
        { status: 400 }
      );
    }

    const { params, state, position } = await getMorphoMarketData(
      address as Address
    );

    const posArr = position as readonly bigint[] | null;
    const stateArr = state as readonly bigint[] | null;
    const paramsArr = params as readonly unknown[] | null;

    const { userCollateral, userBorrow } = parseUserPosition(posArr, stateArr);
    const lltv = parseLLTV(paramsArr);
    const oraclePrice = params ? await getOraclePrice(params) : 0;

    const {
      currentLTV,
      maxWithdrawable,
      liquidationPrice,
      percentDropToLiquidation,
    } = computePositionMetrics(userCollateral, userBorrow, oraclePrice, lltv);

    const hasPosition = userCollateral > 0 || userBorrow > 0;

    return NextResponse.json({
      userCollateral,
      userBorrow,
      currentLTV,
      lltv,
      liquidationPrice,
      percentDropToLiquidation,
      maxWithdrawable,
      oraclePrice,
      hasPosition,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Positions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch position data" },
      { status: 500 }
    );
  }
}
