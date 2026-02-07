"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

/**
 * Checks whether the user's embedded wallet already has a server signer
 * (delegated). Returns `{ isDelegated, isLoading, embeddedWallet }`.
 */
export function useDelegationStatus() {
  const { authenticated, ready, user } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === "privy"
  );

  const isLoading = !ready || (authenticated && !user);

  if (!authenticated || !user || !embeddedWallet) {
    return { isDelegated: false, isLoading, embeddedWallet: null };
  }

  const isDelegated = user.linkedAccounts?.some(
    (account) =>
      account.type === "wallet" &&
      "delegated" in account &&
      (account as any).delegated === true &&
      "address" in account &&
      (account as any).address?.toLowerCase() ===
        embeddedWallet.address.toLowerCase()
  ) ?? false;

  return { isDelegated, isLoading, embeddedWallet };
}
