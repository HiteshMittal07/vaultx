import { parseUnits, Address, encodeFunctionData, Call } from "viem";
import { MORPHO_ABI } from "@/constants/abis";
import { USDT, XAUT, MORPHO_ADDRESS } from "@/constants/addresses";
import { getApproveCallIfNecessary } from "@/lib/blockchain/erc20";

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
  const validActions: BorrowAction[] = [
    "supply",
    "borrow",
    "repay",
    "withdraw",
  ];
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
export async function buildSupplyCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address,
): Promise<Call[]> {
  const parsedAmount = parseUnits(amount, 6);
  const calls: Call[] = [];

  // Add approve call if necessary
  const approveCalls = await getApproveCallIfNecessary(
    XAUT as Address,
    userAddress,
    MORPHO_ADDRESS as Address,
    parsedAmount,
  );
  calls.push(...approveCalls);

  calls.push({
    to: MORPHO_ADDRESS as Address,
    data: encodeFunctionData({
      abi: MORPHO_ABI,
      functionName: "supplyCollateral",
      args: [marketParams, parsedAmount, userAddress, "0x"],
    }),
    value: BigInt(0),
  });

  return calls;
}

/**
 * Builds borrow calls.
 */
export async function buildBorrowCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address,
): Promise<Call[]> {
  const parsedAmount = parseUnits(amount, 6);

  return [
    {
      to: MORPHO_ADDRESS as Address,
      data: encodeFunctionData({
        abi: MORPHO_ABI,
        functionName: "borrow",
        args: [marketParams, parsedAmount, BigInt(0), userAddress, userAddress],
      }),
      value: BigInt(0),
    },
  ];
}

/**
 * Builds repay calls.
 */
export async function buildRepayCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address,
  max?: boolean,
  userPosition?: readonly bigint[] | null,
): Promise<Call[]> {
  const approvalAmount = max
    ? BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      )
    : parseUnits(amount, 6);

  const assetsToRepay = max ? BigInt(0) : parseUnits(amount, 6);
  const sharesToRepay = max ? BigInt(userPosition?.[1] || 0) : BigInt(0);

  const calls: Call[] = [];

  // Add approve call if necessary
  const approveCalls = await getApproveCallIfNecessary(
    USDT as Address,
    userAddress,
    MORPHO_ADDRESS as Address,
    approvalAmount,
  );
  calls.push(...approveCalls);

  calls.push({
    to: MORPHO_ADDRESS as Address,
    data: encodeFunctionData({
      abi: MORPHO_ABI,
      functionName: "repay",
      args: [marketParams, assetsToRepay, sharesToRepay, userAddress, "0x"],
    }),
    value: BigInt(0),
  });

  return calls;
}

/**
 * Builds withdraw collateral calls.
 */
export async function buildWithdrawCalls(
  amount: string,
  marketParams: MarketParams,
  userAddress: Address,
  max?: boolean,
  userPosition?: readonly bigint[] | null,
): Promise<Call[]> {
  const parsedAmount = max
    ? BigInt(userPosition?.[2] || 0)
    : parseUnits(amount, 6);

  return [
    {
      to: MORPHO_ADDRESS as Address,
      data: encodeFunctionData({
        abi: MORPHO_ABI,
        functionName: "withdrawCollateral",
        args: [marketParams, parsedAmount, userAddress, userAddress],
      }),
      value: BigInt(0),
    },
  ];
}

/**
 * Builds calls for the given action.
 */
export async function buildBorrowActionCalls(
  params: BorrowParams,
): Promise<BorrowCallsResult> {
  const { action, amount, max, marketParams, userAddress, userPosition } =
    params;

  let calls: Call[] = [];
  let parsedAmount = BigInt(0);

  switch (action) {
    case "supply":
      calls = await buildSupplyCalls(amount, marketParams, userAddress);
      parsedAmount = parseUnits(amount, 6);
      break;

    case "borrow":
      calls = await buildBorrowCalls(amount, marketParams, userAddress);
      parsedAmount = parseUnits(amount, 6);
      break;

    case "repay":
      calls = await buildRepayCalls(
        amount,
        marketParams,
        userAddress,
        max,
        userPosition,
      );
      parsedAmount = max
        ? BigInt(userPosition?.[1] || 0)
        : parseUnits(amount, 6);
      break;

    case "withdraw":
      calls = await buildWithdrawCalls(
        amount,
        marketParams,
        userAddress,
        max,
        userPosition,
      );
      parsedAmount = max
        ? BigInt(userPosition?.[2] || 0)
        : parseUnits(amount, 6);
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
export async function buildSupplyAndBorrowCalls(
  supplyAmount: string,
  borrowAmount: string,
  marketParams: MarketParams,
  userAddress: Address,
): Promise<Call[]> {
  const calls: Call[] = [];

  if (Number(supplyAmount) > 0) {
    const supplyCalls = await buildSupplyCalls(
      supplyAmount,
      marketParams,
      userAddress,
    );
    calls.push(...supplyCalls);
  }

  if (Number(borrowAmount) > 0) {
    const borrowCalls = await buildBorrowCalls(
      borrowAmount,
      marketParams,
      userAddress,
    );
    calls.push(...borrowCalls);
  }

  return calls;
}

/**
 * Builds combined calls for repay + withdraw in one transaction.
 */
export async function buildRepayAndWithdrawCalls(
  repayAmount: string,
  withdrawAmount: string,
  marketParams: MarketParams,
  userAddress: Address,
  repayMax?: boolean,
  withdrawMax?: boolean,
  userPosition?: readonly bigint[] | null,
): Promise<Call[]> {
  const calls: Call[] = [];

  if (Number(repayAmount) > 0) {
    const repayCalls = await buildRepayCalls(
      repayAmount,
      marketParams,
      userAddress,
      repayMax,
      userPosition,
    );
    calls.push(...repayCalls);
  }

  if (Number(withdrawAmount) > 0) {
    const withdrawCalls = await buildWithdrawCalls(
      withdrawAmount,
      marketParams,
      userAddress,
      withdrawMax,
      userPosition,
    );
    calls.push(...withdrawCalls);
  }

  return calls;
}
