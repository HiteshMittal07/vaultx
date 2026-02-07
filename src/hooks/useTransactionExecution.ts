"use client";

import { useState, useCallback } from "react";
import { Address, Hex } from "viem";
import {
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";
import { publicClient } from "@/lib/blockchain/client";
import { bigIntReplacer } from "@/services/account-abstraction";
import { arbitrum } from "@/constants/config";
import { usePrivy } from "@privy-io/react-auth";

export type ExecutionMode = "online" | "offline";

interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface UseTransactionExecutionOptions {
  address: Address | undefined;
  signMessage: (params: { message: string }) => Promise<{ signature: string }>;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export function useTransactionExecution(options: UseTransactionExecutionOptions) {
  const { address, signMessage, onSuccess, onError } = options;
  const { getAccessToken } = usePrivy();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("online");

  /**
   * Execute a transaction using the online path (user signs).
   */
  const executeOnline = useCallback(
    async (
      prepareEndpoint: string,
      prepareBody: object
    ): Promise<ExecutionResult> => {
      if (!address) {
        return { success: false, error: "No wallet address" };
      }

      setIsExecuting(true);
      setExecutionMode("online");

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          return { success: false, error: "No access token" };
        }
        // 1. Prepare UserOp via backend
        const prepareResponse = await fetch(prepareEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...prepareBody,
            userAddress: address,
          }),
        });

        const prepareData = await prepareResponse.json();

        if (prepareData.error) {
          throw new Error(prepareData.error);
        }

        const { unsignedUserOp } = prepareData;

        // 2. Convert string bigints back to BigInt for hashing
        const userOp = deserializeUserOp(unsignedUserOp);

        // 3. Sign UserOp hash
        const hash = getUserOperationHash({
          chainId: arbitrum.id,
          entryPointAddress: entryPoint07Address,
          entryPointVersion: "0.7",
          userOperation: {
            ...userOp,
            signature: "0x" as Hex,
          },
        });

        const { signature } = await signMessage({ message: hash });

        // 4. Submit to relay
        const executeResponse = await fetch("/api/aa/execute", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            {
              userOp: { ...unsignedUserOp, signature },
              authorization: null,
            },
            bigIntReplacer,
          ),
        });

        const { txHash, error: relayError } = await executeResponse.json();
        if (relayError) throw new Error(relayError);

        // 5. Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });

        onSuccess?.(txHash);
        return { success: true, txHash };
      } catch (error: any) {
        console.error("Online execution failed:", error);
        const errorMessage = error.message || "Execution failed";
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsExecuting(false);
      }
    },
    [address, signMessage, onSuccess, onError]
  );

  /**
   * Execute swap using the simplified backend API.
   */
  const executeSwap = useCallback(
    async (params: {
      tokenIn: Address;
      tokenOut: Address;
      amountIn: string;
      decimalsIn?: number;
      decimalsOut?: number;
      slippage?: string;
      deadline?: string;
    }): Promise<ExecutionResult> => {
      return executeOnline("/api/swap/prepare", params);
    },
    [executeOnline]
  );

  /**
   * Execute borrow action using the simplified backend API.
   */
  const executeBorrowAction = useCallback(
    async (params: {
      supplyAmount?: string;
      borrowAmount?: string;
      repayAmount?: string;
      withdrawAmount?: string;
      repayMax?: boolean;
      withdrawMax?: boolean;
    }): Promise<ExecutionResult> => {
      return executeOnline("/api/borrow/prepare", params);
    },
    [executeOnline]
  );

  return {
    isExecuting,
    executionMode,
    executeOnline,
    executeSwap,
    executeBorrowAction,
  };
}

/**
 * Deserialize UserOp from API response (converts strings back to BigInt).
 */
function deserializeUserOp(userOp: any) {
  return {
    sender: userOp.sender as Address,
    nonce: BigInt(userOp.nonce),
    callData: userOp.callData as Hex,
    callGasLimit: BigInt(userOp.callGasLimit),
    verificationGasLimit: BigInt(userOp.verificationGasLimit),
    preVerificationGas: BigInt(userOp.preVerificationGas),
    maxFeePerGas: BigInt(userOp.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
    signature: "0x" as Hex,
  };
}
