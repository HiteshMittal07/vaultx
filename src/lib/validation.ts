import { z } from "zod";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const ethAddress = z.string().regex(addressRegex, "Invalid Ethereum address");
const numericString = z.string().regex(/^\d+(\.\d+)?$/, "Must be a numeric string");

// ─── Execute Offline ────────────────────────────────────────────

const BorrowOfflineParams = z.object({
  action: z.enum(["supply", "borrow", "repay", "withdraw"]).optional(),
  amount: numericString.optional(),
  max: z.boolean().optional(),
  supplyAmount: numericString.optional(),
  borrowAmount: numericString.optional(),
  repayAmount: numericString.optional(),
  withdrawAmount: numericString.optional(),
  repayMax: z.boolean().optional(),
  withdrawMax: z.boolean().optional(),
});

const SwapOfflineParams = z.object({
  tokenIn: ethAddress,
  tokenOut: ethAddress,
  amountIn: numericString,
  amountOut: numericString.optional(),
  decimalsIn: z.number().int().min(0).max(18).optional(),
  decimalsOut: z.number().int().min(0).max(18).optional(),
  slippage: numericString.optional(),
  deadline: numericString.optional(),
});

export const ExecuteOfflineSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("borrow"),
    userAddress: ethAddress,
    params: BorrowOfflineParams,
  }),
  z.object({
    type: z.literal("swap"),
    userAddress: ethAddress,
    params: SwapOfflineParams,
  }),
]);

// ─── Borrow Prepare ─────────────────────────────────────────────

export const BorrowPrepareSchema = z.object({
  userAddress: ethAddress,
  authorization: z.any().optional(),
  // Single action mode
  action: z.enum(["supply", "borrow", "repay", "withdraw"]).optional(),
  amount: numericString.optional(),
  max: z.boolean().optional(),
  // Combined action mode
  supplyAmount: z.string().optional(),
  borrowAmount: z.string().optional(),
  repayAmount: z.string().optional(),
  withdrawAmount: z.string().optional(),
  repayMax: z.boolean().optional(),
  withdrawMax: z.boolean().optional(),
});

// ─── Swap Prepare ───────────────────────────────────────────────

export const SwapPrepareSchema = z.object({
  tokenIn: ethAddress,
  tokenOut: ethAddress,
  amountIn: numericString,
  decimalsIn: z.number().int().min(0).max(18).optional().default(6),
  decimalsOut: z.number().int().min(0).max(18).optional().default(6),
  slippage: numericString.optional().default("5.0"),
  deadline: numericString.optional().default("30"),
  userAddress: ethAddress,
  authorization: z.any().optional(),
});

// ─── Helper ─────────────────────────────────────────────────────

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}
