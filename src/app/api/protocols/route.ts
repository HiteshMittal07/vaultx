import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { getProtocolsOverview } from "@/services/api/protocols.service";

/**
 * GET /api/protocols?userAddress=0x...
 *
 * Returns all supported XAUt/USDT lending markets across protocols,
 * plus the user's positions (if userAddress is provided).
 *
 * Response:
 * {
 *   markets: ProtocolMarket[],
 *   positions: ProtocolPosition[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress") as Address | null;

    const overview = await getProtocolsOverview(
      userAddress || undefined,
    );

    return NextResponse.json(overview);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch protocols";
    console.error("Error in /api/protocols:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
