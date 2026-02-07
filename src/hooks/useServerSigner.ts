"use client";

import { useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSigners } from "@privy-io/react-auth";

const AUTHORIZATION_KEY_QUORUM_ID =
  process.env.NEXT_PUBLIC_AUTHORIZATION_KEY_ID!;
const POLICY_ID = process.env.NEXT_PUBLIC_PRIVY_POLICY_ID;

/**
 * Registers the server's authorization key as a signer on the user's
 * embedded wallet after login. This enables the backend to sign and
 * execute transactions on behalf of the user when they are offline.
 *
 * Skips registration if the wallet is already delegated.
 */
export function useServerSigner() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { addSigners } = useSigners();
  const hasRegistered = useRef(false);

  useEffect(() => {
    if (!authenticated || !user || hasRegistered.current) return;

    const embeddedWallet = wallets.find(
      (w) => w.walletClientType === "privy"
    );
    if (!embeddedWallet) return;

    // Check if wallet already has a signer (delegated flag)
    const alreadyDelegated = user.linkedAccounts?.some(
      (account) =>
        account.type === "wallet" &&
        "delegated" in account &&
        (account as any).delegated === true &&
        "address" in account &&
        (account as any).address?.toLowerCase() ===
          embeddedWallet.address.toLowerCase()
    );

    if (alreadyDelegated) {
      hasRegistered.current = true;
      return;
    }

    const registerSigner = async () => {
      try {
        await addSigners({
          address: embeddedWallet.address,
          signers: [
            {
              signerId: AUTHORIZATION_KEY_QUORUM_ID,
              policyIds: POLICY_ID ? [POLICY_ID] : [],
            },
          ],
        });
        hasRegistered.current = true;
        console.log("[ServerSigner] Registered server signer on wallet");
      } catch (error) {
        console.error("[ServerSigner] Failed to register signer:", error);
      }
    };

    registerSigner();
  }, [authenticated, user, wallets, addSigners]);
}
