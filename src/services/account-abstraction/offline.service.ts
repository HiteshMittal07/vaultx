import { Address, Hex, Call } from "viem";
import {
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";
import { arbitrum } from "@/constants/config";
import { AAService } from "./aa.service";
import {
  getPrivyWalletId,
  signUserOpHash,
} from "@/services/privy/privy.server";

export interface OfflineExecutionResult {
  txHash: Hex;
  userOpHash: Hex;
}

/**
 * Executes a transaction offline (without user in the loop).
 * Combines prepare + sign (via Privy authorization key) + execute (via relayer).
 */
export async function executeOffline(
  walletAddress: Address,
  calls: Call[]
): Promise<OfflineExecutionResult> {
  // 1. Prepare UserOp (reuses existing AAService.prepare)
  const userOp = await AAService.prepare(walletAddress, calls);

  // 2. Compute UserOp hash
  const userOpHash = getUserOperationHash({
    chainId: arbitrum.id,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    userOperation: {
      ...userOp,
      signature: "0x" as Hex,
    },
  });

  // 3. Get Privy wallet ID from Ethereum address
  const walletId = await getPrivyWalletId(walletAddress);

  // 4. Sign UserOp hash via Privy server SDK (authorization key)
  const signature = await signUserOpHash(walletId, userOpHash);

  // 5. Execute signed UserOp via relayer (reuses existing AAService.execute)
  const signedUserOp = { ...userOp, signature };
  const txHash = await AAService.execute(signedUserOp);

  return { txHash, userOpHash };
}
