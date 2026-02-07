import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";

const COLLECTION = "transaction_history";

/**
 * GET /api/history?walletAddress=0x...
 * Fetches transaction history for a wallet, sorted by timestamp desc.
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

    const db = await getDb();
    const history = await db
      .collection(COLLECTION)
      .find({ walletAddress: walletAddress.toLowerCase() })
      .sort({ timestamp: -1 })
      .toArray();

    // Strip MongoDB _id and return
    const result = history.map((doc) => {
      const { _id, ...rest } = doc;
      void _id;
      return {
        ...rest,
        id: rest.txHash,
        timestamp: rest.timestamp.toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[API] History fetch error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/history
 * Saves a new transaction history entry.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, action, txHash, executedBy, status, ...metadata } =
      body;

    if (!walletAddress || !action || !txHash || !executedBy) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, action, txHash, executedBy" },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db.collection(COLLECTION).insertOne({
      walletAddress: walletAddress.toLowerCase(),
      action,
      txHash,
      executedBy,
      status: status || "success",
      timestamp: new Date(),
      ...metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[API] History save error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
