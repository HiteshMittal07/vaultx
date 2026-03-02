import { PrivyClient } from "@privy-io/node";
import type { LinkedAccount } from "@privy-io/node";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.APP_SECRET!,
});

interface AuthResult {
  userId: string;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) {
      // Still consume constant time, then return false
      timingSafeEqual(aBuf, aBuf);
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/**
 * Verifies the X-Internal-Key header for internal-only endpoints.
 * Uses constant-time comparison to prevent timing attacks.
 * Returns null on success, or a NextResponse error.
 */
export function verifyInternalKey(
  request: NextRequest | Request
): NextResponse | null {
  const key = request.headers.get("X-Internal-Key");
  const expected = process.env.INTERNAL_API_KEY;

  if (!expected) {
    console.error("[Auth] INTERNAL_API_KEY env var is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (!key || !safeCompare(key, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * Verifies the Authorization: Bearer <token> header via Privy.
 * Returns an AuthResult on success, or a NextResponse error.
 */
export async function verifyAuth(
  request: NextRequest | Request
): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const accessToken = authHeader.slice("Bearer ".length);

  try {
    const verifiedClaims = await privy
      .utils()
      .auth()
      .verifyAuthToken(accessToken);

    return { userId: verifiedClaims.user_id as string };
  } catch (error) {
    console.error("[Auth] Token verification failed:", error);
    return NextResponse.json(
      { error: "Invalid or expired access token" },
      { status: 401 }
    );
  }
}

// Cache user → addresses mapping to avoid repeated Privy API calls.
// Bounded to MAX_CACHE_SIZE entries to prevent unbounded memory growth on
// long-running (non-serverless) deployments.
const MAX_CACHE_SIZE = 5_000;
const addressCache = new Map<
  string,
  { addresses: string[]; expiresAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies that the given address belongs to the authenticated user.
 * Returns null if valid, or a 403 NextResponse if not.
 */
export async function verifyAddressOwnership(
  userId: string,
  address: string
): Promise<NextResponse | null> {
  const normalizedAddress = address.toLowerCase();

  // Check cache first
  const cached = addressCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.addresses.includes(normalizedAddress)) return null;
    return NextResponse.json(
      { error: "Address does not belong to authenticated user" },
      { status: 403 }
    );
  }

  try {
    const user = await privy.users()._get(userId);
    const walletAddresses = (user.linked_accounts as LinkedAccount[])
      .filter(
        (a): a is Extract<LinkedAccount, { address: string }> =>
          "address" in a &&
          typeof a.address === "string" &&
          (a.type === "wallet" || a.type === "smart_wallet")
      )
      .map((a) => a.address.toLowerCase());

    // Evict oldest entry if cache is at capacity
    if (addressCache.size >= MAX_CACHE_SIZE) {
      const firstKey = addressCache.keys().next().value;
      if (firstKey !== undefined) addressCache.delete(firstKey);
    }

    addressCache.set(userId, {
      addresses: walletAddresses,
      expiresAt: Date.now() + CACHE_TTL,
    });

    if (walletAddresses.includes(normalizedAddress)) return null;
    return NextResponse.json(
      { error: "Address does not belong to authenticated user" },
      { status: 403 }
    );
  } catch (error) {
    console.error("[Auth] Address ownership check failed:", error);
    return NextResponse.json(
      { error: "Failed to verify address ownership" },
      { status: 500 }
    );
  }
}
