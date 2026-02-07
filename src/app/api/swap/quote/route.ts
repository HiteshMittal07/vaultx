import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { getQuote } from "@/services/api/swap.service";

/**
 * GET /api/swap/quote?tokenIn=0x...&tokenOut=0x...&amountIn=100&decimalsIn=6&decimalsOut=6
 * Returns a Uniswap V3 quote for the given swap parameters.
 * Public endpoint - no auth required.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tokenIn = searchParams.get("tokenIn");
    const tokenOut = searchParams.get("tokenOut");
    const amountIn = searchParams.get("amountIn");
    const decimalsIn = Number(searchParams.get("decimalsIn") || "6");
    const decimalsOut = Number(searchParams.get("decimalsOut") || "6");

    if (!tokenIn || !tokenOut || !amountIn) {
      return NextResponse.json(
        { error: "Missing required parameters: tokenIn, tokenOut, amountIn" },
        { status: 400 }
      );
    }

    const amount = Number(amountIn);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amountIn" },
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
