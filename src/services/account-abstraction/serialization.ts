/**
 * JSON.stringify replacer to handle BigInt serialization.
 */
export const bigIntReplacer = (_key: string, value: any) => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

/**
 * JSON.parse reviver to handle BigInt deserialization.
 * Note: This requires knowing which fields are supposed to be BigInt,
 * or using a heuristic like checking if a string looks like a large number.
 * For UserOperations, specific fields are always BigInt.
 */
export const parseUserOpWithBigInt = (userOp: any) => {
  return {
    ...userOp,
    nonce: BigInt(userOp.nonce),
    maxFeePerGas: BigInt(userOp.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
    preVerificationGas: BigInt(userOp.preVerificationGas),
    verificationGasLimit: BigInt(userOp.verificationGasLimit),
    callGasLimit: BigInt(userOp.callGasLimit),
  };
};
