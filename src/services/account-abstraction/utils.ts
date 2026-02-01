import { Hex, hexToBytes, Address, encodePacked, encodeFunctionData, Call } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";
import { BASE_GAS, EXECUTION_MODE, ERC7821_ABI } from "./constants";

/**
 * Calculates the gas cost of calldata.
 */
export const calculateCalldataGas = (data: Hex): bigint =>
  hexToBytes(data).reduce((gas, byte) => gas + (byte === 0 ? BigInt(4) : BigInt(16)), BigInt(0));

/**
 * Subtracts base gas and calldata gas from a total estimate.
 */
export const subtractBaseAndCalldataGas = (gas: bigint, data: Hex): bigint => {
  return gas - BASE_GAS - calculateCalldataGas(data);
};

/**
 * Generates EIP-7702 delegation code.
 */
export const getDelegationCode = (delegation: Address): Hex =>
  `0xef0100${delegation.slice(2)}` as Hex;

/**
 * Encodes calls for ERC-7579 execution.
 */
export const encodeERC7579Calls = (calls: Call[]): Hex => {
  const isSingle = calls.length === 1;
  const executionMode = isSingle ? EXECUTION_MODE.single : EXECUTION_MODE.default;

  const encodedCalls = isSingle
    ? encodePacked(
        ["address", "uint256", "bytes"],
        [calls[0].to, calls[0].value || BigInt(0), calls[0].data || "0x"]
      )
    : encodeCalls(calls);

  return encodeFunctionData({
    abi: ERC7821_ABI,
    functionName: "execute",
    args: [executionMode, encodedCalls],
  });
};
