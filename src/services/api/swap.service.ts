import {
  parseUnits,
  formatUnits,
  Address,
  encodeFunctionData,
  Call,
} from "viem";
import { publicClient } from "@/lib/blockchain/client";
import { QUOTER_ABI, ROUTER_ABI } from "@/constants/abis";
import { V3_QUOTER, SWAP_ROUTER_02 } from "@/constants/addresses";
import { getApproveCallIfNecessary } from "@/lib/blockchain/erc20";
import { DEFAULT_FEE } from "@/constants/config";

/**
 * Swap Service - Server-side swap logic.
 * Moves call building from SwapCard.tsx to backend.
 */

export interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  decimalsIn: number;
  decimalsOut: number;
  slippage: string;
  deadline: string;
  recipient: Address;
}

export interface SwapQuoteResult {
  amountOut: string;
  amountOutRaw: bigint;
}

export interface SwapCallsResult {
  calls: Call[];
  amountIn: bigint;
  amountOutMinimum: bigint;
}

/**
 * Validates swap parameters.
 */
export function validateSwapParams(params: SwapParams): {
  valid: boolean;
  error?: string;
} {
  const { tokenIn, tokenOut, amountIn, slippage, deadline } = params;

  // Check addresses
  if (!tokenIn || !tokenOut) {
    return { valid: false, error: "Missing token addresses" };
  }

  if (tokenIn === tokenOut) {
    return { valid: false, error: "Cannot swap same token" };
  }

  // Check amount
  const amount = Number(amountIn);
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: "Invalid amount" };
  }

  // Check slippage
  const slip = Number(slippage);
  if (isNaN(slip) || slip < 0 || slip > 50) {
    return { valid: false, error: "Invalid slippage (0-50%)" };
  }

  // Check deadline
  const dead = Number(deadline);
  if (isNaN(dead) || dead < 1 || dead > 4320) {
    return { valid: false, error: "Invalid deadline (1-4320 minutes)" };
  }

  return { valid: true };
}

/**
 * Fetches a quote from Uniswap V3.
 */
export async function getQuote(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: string,
  decimalsIn: number,
  decimalsOut: number,
): Promise<SwapQuoteResult> {
  const parsedAmountIn = parseUnits(amountIn, decimalsIn);

  const { result } = await publicClient.simulateContract({
    address: V3_QUOTER,
    abi: QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: [tokenIn, tokenOut, DEFAULT_FEE, parsedAmountIn, BigInt(0)],
  });

  return {
    amountOut: formatUnits(result, decimalsOut),
    amountOutRaw: result,
  };
}

/**
 * Builds swap calls with quote (fetches quote and applies slippage).
 */
export async function buildSwapCallsWithQuote(
  params: SwapParams,
): Promise<SwapCallsResult & { quote: SwapQuoteResult }> {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    decimalsIn,
    decimalsOut,
    slippage,
    deadline,
    recipient,
  } = params;

  // Get quote
  const quote = await getQuote(
    tokenIn,
    tokenOut,
    amountIn,
    decimalsIn,
    decimalsOut,
  );

  // Calculate minimum amount with slippage
  const slippageMultiplier = BigInt(
    Math.floor((1 - Number(slippage) / 100) * 10000),
  );
  const amountOutMinimum =
    (quote.amountOutRaw * slippageMultiplier) / BigInt(10000);

  const parsedAmountIn = parseUnits(amountIn, decimalsIn);
  const deadlineTimestamp = BigInt(
    Math.floor(Date.now() / 1000) + Number(deadline) * 60,
  );

  // Build swap call with calculated minimum
  const swapData = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn,
        tokenOut,
        fee: DEFAULT_FEE,
        recipient,
        deadline: deadlineTimestamp,
        amountIn: parsedAmountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  });

  const calls: Call[] = [];

  // Add approve call if necessary
  const approveCalls = await getApproveCallIfNecessary(
    tokenIn,
    recipient,
    SWAP_ROUTER_02 as Address,
    parsedAmountIn,
  );

  calls.push(...approveCalls);

  calls.push({
    to: SWAP_ROUTER_02 as Address,
    data: swapData,
    value: BigInt(0),
  });

  return {
    calls,
    amountIn: parsedAmountIn,
    amountOutMinimum,
    quote,
  };
}
