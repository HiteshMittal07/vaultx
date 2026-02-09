import { Address, Hex, Call } from "viem";
import {
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";
import { PROJECT_CHAIN } from "@/constants/config";
import { publicClient } from "@/lib/blockchain/client";
import { BICONOMY_NEXUS_V1_2_0 } from "@/constants/addresses";
import { AAService } from "./aa.service";
import {
  getPrivyWalletId,
  signUserOpHash,
  sign7702AuthorizationServer,
} from "@/services/privy/privy.server";

export interface OfflineExecutionResult {
  txHash: Hex;
  userOpHash: Hex;
}

/**
 * Checks if the given address has contract code deployed (i.e. is a smart account).
 */
async function isSmartAccount(address: Address): Promise<boolean> {
  const bytecode = await publicClient.getBytecode({ address });
  return !!bytecode && bytecode !== "0x";
}

/**
 * Executes a transaction offline (without user in the loop).
 * Combines prepare + sign (via Privy authorization key) + execute (via relayer).
 *
 * If the wallet is still an EOA, signs an EIP-7702 authorization to delegate
 * it to Biconomy Nexus before preparing and executing the UserOp.
 */
export async function executeOffline(
  walletAddress: Address,
  calls: Call[]
): Promise<OfflineExecutionResult> {
  // 0. Get Privy wallet ID (needed for both authorization signing and UserOp signing)
  const walletId = await getPrivyWalletId(walletAddress);

  // 1. Check if wallet needs EIP-7702 authorization (EOA → smart account)
  let authorization;
  const smart = await isSmartAccount(walletAddress);
  if (!smart) {
    console.log("[Offline] Wallet is EOA, signing EIP-7702 authorization...");
    authorization = await sign7702AuthorizationServer(
      walletId,
      BICONOMY_NEXUS_V1_2_0,
      PROJECT_CHAIN.id,
    );
  }

  // 2. Prepare UserOp (pass authorization for gas estimation state override)
  const userOp = await AAService.prepare(walletAddress, calls, authorization);

  // 3. Compute UserOp hash
  const userOpHash = getUserOperationHash({
    chainId: PROJECT_CHAIN.id,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    userOperation: {
      ...userOp,
      signature: "0x" as Hex,
    },
  });

  // 4. Sign UserOp hash via Privy server SDK (authorization key)
  const signature = await signUserOpHash(walletId, userOpHash);

  // 5. Execute signed UserOp via relayer (pass authorization for authorizationList)
  const signedUserOp = { ...userOp, signature };
  const txHash = await AAService.execute(signedUserOp, authorization);

  return { txHash, userOpHash };
}
