import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { getQuote } from "@/services/api/swap.service";
import { rateLimit } from "@/lib/rate-limit";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;

/**
 * GET /api/swap/quote?tokenIn=0x...&tokenOut=0x...&amountIn=100&decimalsIn=6&decimalsOut=6
 * Returns a Uniswap V3 quote for the given swap parameters.
 * Public endpoint - rate limited by IP.
 */
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limited = rateLimit(`quote:${ip}`, 20, 60_000); // 20 req/min per IP
  if (limited) return limited;

  try {
    const { searchParams } = request.nextUrl;
    const tokenIn = searchParams.get("tokenIn");
    const tokenOut = searchParams.get("tokenOut");
    const amountIn = searchParams.get("amountIn");
    const decimalsInParam = searchParams.get("decimalsIn");
    const decimalsOutParam = searchParams.get("decimalsOut");

    if (!tokenIn || !tokenOut || !amountIn) {
      return NextResponse.json(
        { error: "Missing required parameters: tokenIn, tokenOut, amountIn" },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!addressRegex.test(tokenIn) || !addressRegex.test(tokenOut)) {
      return NextResponse.json(
        { error: "Invalid token address format" },
        { status: 400 }
      );
    }

    // Validate tokenIn !== tokenOut
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      return NextResponse.json(
        { error: "tokenIn and tokenOut must be different" },
        { status: 400 }
      );
    }

    const amount = Number(amountIn);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amountIn: must be a positive number" },
        { status: 400 }
      );
    }

    const decimalsIn = decimalsInParam !== null ? Number(decimalsInParam) : 6;
    const decimalsOut = decimalsOutParam !== null ? Number(decimalsOutParam) : 6;

    if (
      !Number.isInteger(decimalsIn) || decimalsIn < 0 || decimalsIn > 18 ||
      !Number.isInteger(decimalsOut) || decimalsOut < 0 || decimalsOut > 18
    ) {
      return NextResponse.json(
        { error: "decimalsIn and decimalsOut must be integers between 0 and 18" },
        { status: 400 }
      );
    }

    const quote = await getQuote(
      tokenIn as Address,
      tokenOut as Address,
      amountIn,
      decimalsIn,
      decimalsOut
    );

    return NextResponse.json({
      amountOut: quote.amountOut,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Swap quote error:", error);
    return NextResponse.json(
      { error: "No liquidity or route found" },
      { status: 500 }
    );
  }
}
