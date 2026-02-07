import { PrivyClient } from "@privy-io/node";
import { NextRequest, NextResponse } from "next/server";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.APP_SECRET!,
});

interface AuthResult {
  userId: string;
}

/**
 * Verifies the Privy access token from the Authorization header.
 * Returns the verified user ID or a NextResponse error.
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

  const accessToken = authHeader.replace("Bearer ", "");

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
