import { Address, Call, encodeFunctionData } from "viem";
import { publicClient } from "./client";
import { ERC20_ABI } from "@/constants/abis";
import { USDT } from "@/constants/addresses";

/**
 * Checks if an approval is necessary for a given spender and amount.
 * Specifically handles USDT's zero-allowance protection on Mainnet by
 * NOT including an approve call if the current allowance is already sufficient.
 *
 * @param token The token address
 * @param owner The owner address (user's smart account)
 * @param spender The spender address (e.g. Morpho, Uniswap Router)
 * @param amount The required amount
 * @returns A Call[] containing the approve call if needed, or empty array if allowance is sufficient.
 */
export async function getApproveCallIfNecessary(
  token: Address,
  owner: Address,
  spender: Address,
  amount: bigint,
): Promise<Call[]> {
  try {
    const allowance = (await publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    })) as bigint;

    // If allowance is sufficient, no need for a new approve call.
    // This is critical for USDT on Mainnet which reverts if you approve
    // a non-zero value when allowance is already non-zero.
    if (allowance >= amount) {
      return [];
    }

    // Special case for USDT: if allowance > 0 and we need more, we might need to set it to 0 first.
    // However, for simplicity and gas efficiency, if we have enough we do nothing.
    // If we don't have enough and it's non-zero, we should ideally set to 0 then to amount.
    // But most of our "max" approvals use type(uint256).max, which once set, usually suffices forever.

    // For USDT specifically, if allowance > 0 but < amount, we MUST set to 0 first.
    if (token.toLowerCase() === USDT.toLowerCase() && allowance > BigInt(0)) {
      return [
        {
          to: token,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [spender, BigInt(0)],
          }),
          value: BigInt(0),
        },
        {
          to: token,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [spender, amount],
          }),
          value: BigInt(0),
        },
      ];
    }

    return [
      {
        to: token,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spender, amount],
        }),
        value: BigInt(0),
      },
    ];
  } catch (error) {
    console.error(`Error checking allowance for token ${token}:`, error);
    // Fallback: try to approve anyway (might revert if USDT)
    return [
      {
        to: token,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spender, amount],
        }),
        value: BigInt(0),
      },
    ];
  }
}
