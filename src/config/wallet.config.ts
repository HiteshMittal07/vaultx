import { PrivyClientConfig } from "@privy-io/react-auth";
import { http } from "viem";
import { PROJECT_CHAIN } from "@/constants/config";
import { createConfig } from "@privy-io/wagmi";

export const wagmiConfig = createConfig({
  chains: [PROJECT_CHAIN],
  transports: {
    [PROJECT_CHAIN.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  loginMethods: ["email"],
  appearance: {
    theme: "dark",
    accentColor: "#676FFF",
    showWalletLoginFirst: false,
  },
};
