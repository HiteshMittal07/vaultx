import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { verifyAuth, verifyAddressOwnership } from "@/lib/auth";

const COLLECTION = "transaction_history";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const ethAddress = z.string().regex(addressRegex, "Invalid Ethereum address");

const HistoryPostSchema = z.object({
  walletAddress: ethAddress,
  action: z.enum(["supply", "borrow", "repay", "withdraw", "swap", "migrate"]),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid tx hash"),
  executedBy: z.enum(["user", "vaultx-agent"]),
  status: z.enum(["success", "failed", "pending"]).optional().default("success"),
  // Optional swap metadata
  tokenIn: ethAddress.optional(),
  tokenOut: ethAddress.optional(),
  amountIn: z.string().optional(),
  amountOut: z.string().optional(),
  // Optional borrow metadata
  supply: z.string().optional(),
  borrow: z.string().optional(),
  repay: z.string().optional(),
  withdraw: z.string().optional(),
});

/**
 * GET /api/history?walletAddress=0x...
 * Fetches transaction history for a wallet, sorted by timestamp desc.
 * Requires auth + address ownership verification.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    const walletAddress = request.nextUrl.searchParams.get("walletAddress");
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing walletAddress" },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const ownershipError = await verifyAddressOwnership(auth.userId, walletAddress);
    if (ownershipError) return ownershipError;

    const db = await getDb();
    const history = await db
      .collection(COLLECTION)
      .find({ walletAddress: walletAddress.toLowerCase() })
      .sort({ timestamp: -1 })
      .limit(200) // Cap results to prevent excessive data transfer
      .toArray();

    // Strip MongoDB _id and return sanitized records
    const result = history.map((doc) => {
      const { _id, ...rest } = doc;
      void _id;
      return {
        ...rest,
        id: rest.txHash,
        timestamp:
          rest.timestamp instanceof Date
            ? rest.timestamp.toISOString()
            : String(rest.timestamp),
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[API] History fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

/**
 * POST /api/history
 * Saves a new transaction history entry.
 * Requires auth + address ownership verification to prevent history poisoning.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth instanceof NextResponse) return auth;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = HistoryPostSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { walletAddress, ...rest } = parsed.data;

    // Verify the caller owns the address they're writing history for
    const ownershipError = await verifyAddressOwnership(auth.userId, walletAddress);
    if (ownershipError) return ownershipError;

    const db = await getDb();
    await db.collection(COLLECTION).insertOne({
      walletAddress: walletAddress.toLowerCase(),
      ...rest,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[API] History save error:", error);
    return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
  }
}
