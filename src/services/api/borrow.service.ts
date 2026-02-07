import {
  parseUnits,
  Address,
  encodeFunctionData,
  Call,
} from "viem";
import { ERC20_ABI, MORPHO_ABI } from "@/constants/abis";
import {
  USDT0,
  XAUT0,
  MORPHO_ADDRESS,
} from "@/constants/addresses";

type MarketParams = any;

/**
 * Borrow Service - Server-side borrow/repay logic.
 * Moves call building from BorrowDashboard.tsx to backend.
 */

export type BorrowAction = "supply" | "borrow" | "repay" | "withdraw";

export interface BorrowParams {
  action: BorrowAction;
  amount: string;
  max?: boolean;
  marketParams: MarketParams;
  userAddress: Address;
  userPosition?: readonly bigint[] | null;
}

export interface BorrowCallsResult {
  calls: Call[];
  action: BorrowAction;
  amount: bigint;
}

/**
 * Validates borrow parameters.
 */
export function validateBorrowParams(params: BorrowParams): {
  valid: boolean;
  error?: string;
} {
  const { action, amount, marketParams, userAddress } = params;

  // Check action
  const validActions: BorrowAction[] = ["supply", "borrow", "repay", "withdraw"];
  if (!validActions.includes(action)) {
    return { valid: false, error: "Invalid action" };
  }

  // Check amount
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return { valid: false, error: "Invalid amount" };
  }

  // Check market params
  if (!marketParams) {
    return { valid: false, error: "Missing market parameters" };
  }

  // Check user address
  if (!userAddress) {
    return { valid: false, error: "Missing user address" };
  }

  return { valid: true };
}

/**
 * Builds supply collateral calls.
 */
export function buildSupplyCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address
): Call[] {
  const parsedAmount = parseUnits(amount, 6);

  return [
    {
      to: XAUT0 as Address,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [MORPHO_ADDRESS, parsedAmount],
      }),
      value: BigInt(0),
    },
    {
      to: MORPHO_ADDRESS as Address,
      data: encodeFunctionData({
        abi: MORPHO_ABI,
        functionName: "supplyCollateral",
        args: [marketParams, parsedAmount, userAddress, "0x"],
      }),
      value: BigInt(0),
    },
  ];
}

/**
 * Builds borrow calls.
 */
export function buildBorrowCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address
): Call[] {
  const parsedAmount = parseUnits(amount, 6);

  return [
    {
      to: MORPHO_ADDRESS as Address,
      data: encodeFunctionData({
        abi: MORPHO_ABI,
        functionName: "borrow",
        args: [
          marketParams,
          parsedAmount,
          BigInt(0),
          userAddress,
          userAddress,
        ],
      }),
      value: BigInt(0),
    },
  ];
}

/**
 * Builds repay calls.
 */
export function buildRepayCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address,
  max?: boolean,
  userPosition?: readonly bigint[] | null
): Call[] {
  const approvalAmount = max
    ? BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    : parseUnits(amount, 6);

  const assetsToRepay = max ? BigInt(0) : parseUnits(amount, 6);
  const sharesToRepay = max ? BigInt(userPosition?.[1] || 0) : BigInt(0);

  return [
    {
      to: USDT0 as Address,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [MORPHO_ADDRESS, approvalAmount],
      }),
      value: BigInt(0),
    },
    {
      to: MORPHO_ADDRESS as Address,
      data: encodeFunctionData({
        abi: MORPHO_ABI,
        functionName: "repay",
        args: [
          marketParams,
          assetsToRepay,
          sharesToRepay,
          userAddress,
          "0x",
        ],
      }),
      value: BigInt(0),
    },
  ];
}

/**
 * Builds withdraw collateral calls.
 */
export function buildWithdrawCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address,
  max?: boolean,
  userPosition?: readonly bigint[] | null
): Call[] {
  const parsedAmount = max
    ? BigInt(userPosition?.[2] || 0)
    : parseUnits(amount, 6);

  return [
    {
      to: MORPHO_ADDRESS as Address,
      data: encodeFunctionData({
        abi: MORPHO_ABI,
        functionName: "withdrawCollateral",
        args: [
          marketParams,
          parsedAmount,
          userAddress,
          userAddress,
        ],
      }),
      value: BigInt(0),
    },
  ];
}

/**
 * Builds calls for the given action.
 */
export function buildBorrowActionCalls(params: BorrowParams): BorrowCallsResult {
  const { action, amount, max, marketParams, userAddress, userPosition } = params;

  let calls: Call[] = [];
  let parsedAmount = BigInt(0);

  switch (action) {
    case "supply":
      calls = buildSupplyCalls(amount, marketParams, userAddress);
      parsedAmount = parseUnits(amount, 6);
      break;

    case "borrow":
      calls = buildBorrowCalls(amount, marketParams, userAddress);
      parsedAmount = parseUnits(amount, 6);
      break;

    case "repay":
      calls = buildRepayCalls(amount, marketParams, userAddress, max, userPosition);
      parsedAmount = max ? BigInt(userPosition?.[1] || 0) : parseUnits(amount, 6);
      break;

    case "withdraw":
      calls = buildWithdrawCalls(amount, marketParams, userAddress, max, userPosition);
      parsedAmount = max ? BigInt(userPosition?.[2] || 0) : parseUnits(amount, 6);
      break;
  }

  return {
    calls,
    action,
    amount: parsedAmount,
  };
}

/**
 * Builds combined calls for supply + borrow in one transaction.
 */
export function buildSupplyAndBorrowCalls(
  supplyAmount: string,
  borrowAmount: string,
  marketParams: MarketParams,
  userAddress: Address
): Call[] {
  const calls: Call[] = [];

  if (Number(supplyAmount) > 0) {
    calls.push(...buildSupplyCalls(supplyAmount, marketParams, userAddress));
  }

  if (Number(borrowAmount) > 0) {
    calls.push(...buildBorrowCalls(borrowAmount, marketParams, userAddress));
  }

  return calls;
}

/**
 * Builds combined calls for repay + withdraw in one transaction.
 */
export function buildRepayAndWithdrawCalls(
  repayAmount: string,
  withdrawAmount: string,
  marketParams: MarketParams,
  userAddress: Address,
  repayMax?: boolean,
  withdrawMax?: boolean,
  userPosition?: readonly bigint[] | null
): Call[] {
  const calls: Call[] = [];

  if (Number(repayAmount) > 0) {
    calls.push(
      ...buildRepayCalls(repayAmount, marketParams, userAddress, repayMax, userPosition)
    );
  }

  if (Number(withdrawAmount) > 0) {
    calls.push(
      ...buildWithdrawCalls(withdrawAmount, marketParams, userAddress, withdrawMax, userPosition)
    );
  }

  return calls;
}
