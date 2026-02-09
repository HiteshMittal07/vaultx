import { NextRequest, NextResponse } from "next/server";
import { Address, formatUnits } from "viem";
import { getTokenBalances } from "@/lib/blockchain/utils";
import { USDT, XAUT } from "@/constants/addresses";
import { verifyAuth, verifyAddressOwnership } from "@/lib/auth";

/**
 * GET /api/balances?address=0x...
 * Returns formatted token balances for USDT and XAUt.
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

    const ownershipError = await verifyAddressOwnership(auth.userId, address);
    if (ownershipError) return ownershipError;

    const [usdtRaw, xautRaw] = await getTokenBalances(
      address as Address,
      [USDT, XAUT]
    );

    return NextResponse.json({
      usdt: {
        raw: usdtRaw.toString(),
        formatted: formatUnits(usdtRaw, 6),
        decimals: 6,
      },
      xaut: {
        raw: xautRaw.toString(),
        formatted: formatUnits(xautRaw, 6),
        decimals: 6,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Balances fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 500 }
    );
  }
}
