import {
  Address,
  Hex,
  createWalletClient,
  http,
  encodeFunctionData,
  getAddress,
  Authorization,
} from "viem";
import {
  UserOperation,
  entryPoint07Address,
  entryPoint07Abi,
  toPackedUserOperation,
} from "viem/account-abstraction";
import { arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
/**
 * Sends a signed UserOperation via the EntryPoint.
 */
export async function sendUserOperation(
  signedUserOp: UserOperation,
  authorization?: Authorization,
  beneficiary: Address = "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf",
): Promise<Hex> {
  const relayer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const walletClient = createWalletClient({
    account: relayer,
    chain: arbitrum,
    transport: http(),
  });

  const packedUserOp = toPackedUserOperation(signedUserOp);

  const handleOpsData = encodeFunctionData({
    abi: entryPoint07Abi,
    functionName: "handleOps",
    args: [[packedUserOp], getAddress(beneficiary)],
  });

  console.log("[AccountAbstraction] Sending handleOps transaction...");

  let hash;
  if (!authorization) {
    hash = await walletClient.sendTransaction({
      to: entryPoint07Address,
      data: handleOpsData,
    });
  } else {
    hash = await walletClient.sendTransaction({
      to: entryPoint07Address,
      data: handleOpsData,
      authorizationList: [authorization],
    });
  }

  console.log("[AccountAbstraction] Transaction sent:", hash);
  return hash;
}
