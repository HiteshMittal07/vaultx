import { PrivyClient } from "@privy-io/node";
import { Authorization, Hex } from "viem";

// ─── Lazy singletons ─────────────────────────────────────────────────────────
// All env-dependent objects are created lazily on first use so that Next.js
// can collect static page data at build time without blowing up on missing
// environment variables.

let _privy: PrivyClient | null = null;
let _basicAuth: string | null = null;
let _headers: Record<string, string> | null = null;

function getPrivyClient(): PrivyClient {
  if (_privy) return _privy;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "[Privy] NEXT_PUBLIC_PRIVY_APP_ID or APP_SECRET env var is not set."
    );
  }

  _privy = new PrivyClient({ appId, appSecret });
  return _privy;
}

function getBasicAuth(): string {
  if (_basicAuth) return _basicAuth;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.APP_SECRET;
  if (!appId || !appSecret) throw new Error("[Privy] Missing env vars.");
  _basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  return _basicAuth;
}

function getPrivyHeaders(): Record<string, string> {
  if (_headers) return _headers;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) throw new Error("[Privy] Missing NEXT_PUBLIC_PRIVY_APP_ID.");
  _headers = {
    Authorization: `Basic ${getBasicAuth()}`,
    "privy-app-id": appId,
    "Content-Type": "application/json",
  };
  return _headers;
}

function getAuthorizationKey(): string {
  const key = process.env.AUTHORIZATION_PRIVATE_KEY;
  if (!key) throw new Error("[Privy] AUTHORIZATION_PRIVATE_KEY env var is not set.");
  return key;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolves an Ethereum address to a Privy wallet ID.
 */
export async function getPrivyWalletId(
  ethereumAddress: string
): Promise<string> {
  const headers = getPrivyHeaders();

  const userResponse = await fetch(
    "https://api.privy.io/v1/users/wallet/address",
    {
      method: "POST",
      headers,
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
  if (!userId) throw new Error(`No user ID found for address ${ethereumAddress}`);

  const walletsResponse = await fetch(
    `https://api.privy.io/v1/wallets?user_id=${userId}&chain_type=ethereum`,
    { method: "GET", headers }
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
 */
export async function signUserOpHash(
  walletId: string,
  userOpHash: Hex
): Promise<Hex> {
  const privy = getPrivyClient();
  const authKey = getAuthorizationKey();

  const response = await privy
    .wallets()
    .ethereum()
    .signMessage(walletId, {
      message: userOpHash,
      authorization_context: {
        authorization_private_keys: [authKey],
      },
    });

  return response.signature as Hex;
}

/**
 * Signs an EIP-7702 authorization via Privy server SDK.
 */
export async function sign7702AuthorizationServer(
  walletId: string,
  contractAddress: string,
  chainId: number
): Promise<Authorization> {
  const privy = getPrivyClient();
  const authKey = getAuthorizationKey();

  const response = await privy
    .wallets()
    .ethereum()
    .sign7702Authorization(walletId, {
      params: {
        contract: contractAddress,
        chain_id: chainId,
      },
      authorization_context: {
        authorization_private_keys: [authKey],
      },
    });

  return {
    address: response.authorization.contract as `0x${string}`,
    chainId: Number(response.authorization.chain_id),
    nonce: Number(response.authorization.nonce),
    r: response.authorization.r as `0x${string}`,
    s: response.authorization.s as `0x${string}`,
    yParity: response.authorization.y_parity,
  };
}

/** Re-export for any code that needs the raw client */
export function getPrivy(): PrivyClient {
  return getPrivyClient();
}
