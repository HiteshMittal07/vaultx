import { Address, Call, Authorization, UserOperation } from "viem";
import { MOCK_SIGNATURE } from "./constants";
import { encodeERC7579Calls } from "./utils";
import { getPartialUserOp, estimateUserOpGas } from "./userOp";
import { sendUserOperation } from "./entryPoint";

/**
 * Account Abstraction Service
 * Orchestrates the full flow of building, estimating, signing, and sending UserOperations.
 */
export class AAService {
  /**
   * Prepares a UserOperation for signing.
   */
  static async prepare(
    walletAddress: Address,
    calls: Call[],
    authorization?: Authorization,
  ): Promise<UserOperation> {
    const calldata = encodeERC7579Calls(calls);

    // 1. Build partial UserOp
    const userOperation = await getPartialUserOp(
      walletAddress,
      calldata,
      MOCK_SIGNATURE,
      BigInt(0),
    );

    // 2. Estimate Gas
    const gasEstimates = await estimateUserOpGas(userOperation, authorization);

    // 3. Construct final UserOp to sign
    return {
      ...userOperation,
      preVerificationGas: BigInt(0), // Can be refined if needed
      verificationGasLimit: gasEstimates.verificationGasLimit,
      callGasLimit: gasEstimates.callGasLimit,
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
    } as UserOperation;
  }

  /**
   * Signs and sends a UserOperation.
   */
  static async execute(userOp: UserOperation, authorization?: Authorization) {
    return await sendUserOperation(userOp, authorization);
  }
}
