import { createPublicClient, http } from "viem";
import { PROJECT_CHAIN } from "@/constants/config";

export const publicClient = createPublicClient({
  chain: PROJECT_CHAIN,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});
