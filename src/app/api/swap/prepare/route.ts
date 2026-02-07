import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import {
  validateSwapParams,
  buildSwapCallsWithQuote,
  SwapParams,
} from "@/services/api/swap.service";
import { AAService, bigIntReplacer } from "@/services/account-abstraction";
import { verifyAuth } from "@/lib/auth";

/**
 * POST /api/swap/prepare
 * Builds swap UserOp server-side.
 *
 * Request body:
 * {
 *   tokenIn: Address,
 *   tokenOut: Address,
 *   amountIn: string,
 *   decimalsIn: number,
 *   decimalsOut: number,
 *   slippage: string,
 *   deadline: string,
 *   userAddress: Address
 * }
 *
 * Response:
 * { unsignedUserOp, quote } OR { error }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const {
      tokenIn,
      tokenOut,
      amountIn,
      decimalsIn = 6,
      decimalsOut = 6,
      slippage = "5.0",
      deadline = "30",
      userAddress,
      authorization,
    } = body;

    // Validate required fields
    if (!tokenIn || !tokenOut || !amountIn || !userAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const params: SwapParams = {
      tokenIn: tokenIn as Address,
      tokenOut: tokenOut as Address,
      amountIn,
      decimalsIn,
      decimalsOut,
      slippage,
      deadline,
      recipient: userAddress as Address,
    };

    // Validate parameters
    const validation = validateSwapParams(params);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Build calls with quote
    const { calls, quote, amountOutMinimum } = await buildSwapCallsWithQuote(params);

    // Prepare UserOp (authorization needed for gas estimation on EOA wallets)
    const userOp = await AAService.prepare(userAddress as Address, calls, authorization ?? undefined);

    // Serialize UserOp for JSON response
    const serializedUserOp = JSON.parse(JSON.stringify(userOp, bigIntReplacer));

    return NextResponse.json({
      unsignedUserOp: serializedUserOp,
      quote: {
        amountOut: quote.amountOut,
        amountOutMinimum: amountOutMinimum.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("Swap prepare error:", error);

    const message = error instanceof Error ? error.message : "Failed to prepare swap";

    // Handle specific errors
    if (message.includes("No liquidity")) {
      return NextResponse.json(
        { error: "No liquidity or route found" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
