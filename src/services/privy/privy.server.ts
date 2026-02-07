import { PrivyClient } from "@privy-io/node";
import { Hex } from "viem";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_APP_SECRET = process.env.APP_SECRET!;
const AUTHORIZATION_PRIVATE_KEY = process.env.AUTHORIZATION_PRIVATE_KEY!;

const privy = new PrivyClient({
  appId: PRIVY_APP_ID,
  appSecret: PRIVY_APP_SECRET,
});

const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString(
  "base64"
);

const PRIVY_HEADERS = {
  Authorization: `Basic ${basicAuth}`,
  "privy-app-id": PRIVY_APP_ID,
  "Content-Type": "application/json",
};

/**
 * Resolves an Ethereum address to a Privy wallet ID.
 *
 * Two-step lookup:
 * 1. POST /v1/users/wallet/address  (body: { address }) → get user ID
 * 2. GET  /v1/wallets?user_id={userId}&chain_type=ethereum → find matching wallet
 */
export async function getPrivyWalletId(
  ethereumAddress: string
): Promise<string> {
  // Step 1: Look up user by wallet address
  // Docs: POST /v1/users/wallet/address  body: { address: "0x..." }
  const userResponse = await fetch(
    "https://api.privy.io/v1/users/wallet/address",
    {
      method: "POST",
      headers: PRIVY_HEADERS,
      body: JSON.stringify({ address: ethereumAddress }),
    }
  );

  if (!userResponse.ok) {
    const errorBody = await userResponse.text();
    throw new Error(
      `Failed to find user for address ${ethereumAddress}: ${userResponse.status} ${errorBody}`
    );
  }

  const userData = await userResponse.json();
  const userId = userData.id;

  if (!userId) {
    throw new Error(`No user ID found for address ${ethereumAddress}`);
  }

  // Step 2: Get wallets for this user
  const walletsResponse = await fetch(
    `https://api.privy.io/v1/wallets?user_id=${userId}&chain_type=ethereum`,
    {
      method: "GET",
      headers: PRIVY_HEADERS,
    }
  );

  if (!walletsResponse.ok) {
    const errorBody = await walletsResponse.text();
    throw new Error(
      `Failed to fetch wallets for user ${userId}: ${walletsResponse.status} ${errorBody}`
    );
  }

  const walletsData = await walletsResponse.json();
  const wallets = walletsData.data || [];

  const matchingWallet = wallets.find(
    (w: { address: string }) =>
      w.address.toLowerCase() === ethereumAddress.toLowerCase()
  );

  if (!matchingWallet) {
    throw new Error(`No Privy wallet found for address ${ethereumAddress}`);
  }

  return matchingWallet.id;
}

/**
 * Signs a UserOp hash using the server's authorization key via Privy.
 *
 * Uses signMessage (personal_sign) to match the frontend's signing method,
 * since the Biconomy Nexus smart account validator expects this format.
 */
export async function signUserOpHash(
  walletId: string,
  userOpHash: Hex
): Promise<Hex> {
  const response = await privy
    .wallets()
    .ethereum()
    .signMessage(walletId, {
      message: userOpHash,
      authorization_context: {
        authorization_private_keys: [AUTHORIZATION_PRIVATE_KEY],
      },
    });

  return response.signature as Hex;
}

export { privy };
