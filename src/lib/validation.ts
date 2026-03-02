import { z } from "zod";
import type { Authorization } from "viem";

// ─── Shared primitives ────────────────────────────────────────────────────────

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const hexRegex = /^0x[a-fA-F0-9]*$/;

export const ethAddress = z
  .string()
  .regex(addressRegex, "Invalid Ethereum address (must be 0x + 40 hex chars)");

export const numericString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Must be a positive numeric string")
  .refine((v) => Number.isFinite(Number(v)), "Must be a finite number")
  .refine((v) => Number(v) >= 0, "Must be non-negative");

// ─── EIP-7702 Authorization object ───────────────────────────────────────────
// Matches viem's Authorization type: { address, chainId, nonce, r, s, v?, yParity? }

const Eip7702AuthorizationSchema = z
  .object({
    // viem Authorization uses `address` (0x-prefixed checksummed address)
    address: ethAddress,
    chainId: z.number().int().positive(),
    nonce: z.number().int().min(0),
    r: z.string().regex(hexRegex, "r must be a hex string"),
    s: z.string().regex(hexRegex, "s must be a hex string"),
    v: z.bigint().optional(),
    yParity: z.number().int().min(0).max(1).optional(),
  })
  .strict();

/**
 * Parsed and cast to viem's Authorization type.
 * The transform ensures TypeScript accepts the output as Authorization.
 */
export const AuthorizationSchema = Eip7702AuthorizationSchema.transform(
  (val) => val as unknown as Authorization
);

// ─── Execute Offline ─────────────────────────────────────────────────────────

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

// ─── Borrow Prepare ──────────────────────────────────────────────────────────

export const BorrowPrepareSchema = z.object({
  userAddress: ethAddress,
  authorization: AuthorizationSchema.optional(),
  // Single action mode
  action: z.enum(["supply", "borrow", "repay", "withdraw"]).optional(),
  amount: numericString.optional(),
  max: z.boolean().optional(),
  // Combined action mode
  supplyAmount: numericString.optional(),
  borrowAmount: numericString.optional(),
  repayAmount: numericString.optional(),
  withdrawAmount: numericString.optional(),
  repayMax: z.boolean().optional(),
  withdrawMax: z.boolean().optional(),
});

// ─── Swap Prepare ────────────────────────────────────────────────────────────

export const SwapPrepareSchema = z.object({
  tokenIn: ethAddress,
  tokenOut: ethAddress,
  amountIn: numericString,
  decimalsIn: z.number().int().min(0).max(18).optional().default(6),
  decimalsOut: z.number().int().min(0).max(18).optional().default(6),
  slippage: numericString.optional().default("5.0"),
  deadline: numericString.optional().default("30"),
  userAddress: ethAddress,
  authorization: AuthorizationSchema.optional(),
});

// ─── Helper ──────────────────────────────────────────────────────────────────

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
}
