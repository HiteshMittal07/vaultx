import { parseAbi, toFunctionSelector, getAbiItem } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";

export const ENTRYPOINT_ADDRESS = entryPoint07Address;
export const MAX_VERIFICATION_GAS = BigInt(500_000);
export const BASE_GAS = BigInt(21_000);

export const EXECUTION_MODE = {
  single: "0x0000000000000000000000000000000000000000000000000000000000000000",
  default: "0x0100000000000000000000000000000000000000000000000000000000000000",
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000",
} as const;

export type ExecutionMode = keyof typeof EXECUTION_MODE;

export const ERC7821_ABI = parseAbi([
  "function execute(bytes32 mode, bytes executionData) payable",
]);

export const ACCOUNT_EXECUTE_ABI = parseAbi([
  "function executeUserOp(PackedUserOperation userOp, bytes32 userOpHash)",
  "struct PackedUserOperation {address sender; uint256 nonce; bytes initCode; bytes callData; bytes32 accountGasLimits; uint256 preVerificationGas; bytes32 gasFees; bytes paymasterAndData; bytes signature;}",
]);

export const EXECUTE_USER_OP_SELECTOR = toFunctionSelector(
  getAbiItem({ abi: ACCOUNT_EXECUTE_ABI, name: "executeUserOp" }),
);

export const MOCK_SIGNATURE =
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
