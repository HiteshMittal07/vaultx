import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { getProtocolsOverview } from "@/services/api/protocols.service";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/protocols?userAddress=0x...
 *
 * Returns all supported XAUt/USDT lending markets across protocols,
 * plus the user's positions (if userAddress is provided).
 * Public endpoint - rate limited by IP.
 */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limited = rateLimit(`protocols:${ip}`, 20, 60_000); // 20 req/min per IP
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const userAddressParam = searchParams.get("userAddress");

    // Validate address format if provided
    let userAddress: Address | undefined;
    if (userAddressParam) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(userAddressParam)) {
        return NextResponse.json(
          { error: "Invalid userAddress format" },
          { status: 400 }
        );
      }
      userAddress = userAddressParam as Address;
    }

    const overview = await getProtocolsOverview(userAddress);

    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error in /api/protocols:", error);
    return NextResponse.json(
      { error: "Failed to fetch protocols" },
      { status: 500 }
    );
  }
}
