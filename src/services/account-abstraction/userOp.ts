import {
  Address,
  Hex,
  createPublicClient,
  http,
  Authorization,
  StateOverride,
  encodeFunctionData,
} from "viem";
import {
  UserOperation,
  entryPoint07Address,
  entryPoint07Abi,
  getUserOperationHash,
  toPackedUserOperation,
} from "viem/account-abstraction";
import { arbitrum } from "viem/chains";
import {
  MAX_VERIFICATION_GAS,
  EXECUTE_USER_OP_SELECTOR,
  ACCOUNT_EXECUTE_ABI,
} from "./constants";
import { getDelegationCode, subtractBaseAndCalldataGas } from "./utils";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/**
 * Creates a partial UserOperation.
 */
export async function getPartialUserOp(
  from: Address,
  callData: Hex,
  signature: Hex,
  nonceKey: bigint,
  nonce?: bigint,
): Promise<UserOperation> {
  if (!nonce) {
    nonce = await publicClient.readContract({
      address: entryPoint07Address,
      abi: entryPoint07Abi,
      functionName: "getNonce",
      args: [from, nonceKey],
    });
  }

  return {
    callData,
    nonce,
    sender: from,
    maxFeePerGas: BigInt(0),
    maxPriorityFeePerGas: BigInt(0),
    preVerificationGas: BigInt(0),
    verificationGasLimit: BigInt(0),
    callGasLimit: BigInt(0),
    signature,
  };
}

/**
 * Estimates gas for a UserOperation.
 */
export async function estimateUserOpGas(
  userOp: UserOperation,
  authorization?: Authorization,
): Promise<{
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}> {
  let data = userOp.callData;

  // Handle EntryPoint logic emulation if it's an executeUserOp call
  if (data.startsWith(EXECUTE_USER_OP_SELECTOR)) {
    const userOpHash = getUserOperationHash({
      chainId: arbitrum.id,
      entryPointAddress: entryPoint07Address,
      entryPointVersion: "0.7",
      userOperation: userOp,
    });

    data = encodeFunctionData({
      abi: ACCOUNT_EXECUTE_ABI,
      functionName: "executeUserOp",
      args: [toPackedUserOperation(userOp), userOpHash],
    });
  }

  const callGasLimit = await estimateCallGas(
    userOp,
    data,
    entryPoint07Address,
    authorization,
  );

  return {
    preVerificationGas: BigInt(50_000), // Estimated fixed overhead
    verificationGasLimit: MAX_VERIFICATION_GAS,
    callGasLimit,
  };
}

/**
 * Estimates call gas with potential state overrides for EIP-7702.
 */
async function estimateCallGas(
  userOp: UserOperation,
  data: Hex,
  entryPoint: Address,
  authorization?: Authorization,
): Promise<bigint> {
  const stateOverride: StateOverride | undefined = authorization
    ? [
        {
          address: userOp.sender,
          code: getDelegationCode(authorization.address),
        },
      ]
    : undefined;

  const estimatedGas = await publicClient.estimateGas({
    to: userOp.sender,
    data,
    account: entryPoint,
    stateOverride,
    maxFeePerGas: BigInt(0),
    maxPriorityFeePerGas: BigInt(0),
  });

  return subtractBaseAndCalldataGas(estimatedGas, data);
}
