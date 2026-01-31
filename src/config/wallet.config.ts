import { PrivyClientConfig } from "@privy-io/react-auth";
import { http } from "viem";
import { arbitrum } from "viem/chains";
import { createConfig } from "@privy-io/wagmi";

export const wagmiConfig = createConfig({
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: http(),
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
