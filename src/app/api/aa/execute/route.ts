import { NextResponse } from "next/server";
import {
  AAService,
  parseUserOpWithBigInt,
} from "@/services/account-abstraction";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { userOp, authorization } = await req.json();

    if (!userOp) {
      return NextResponse.json({ error: "Missing userOp" }, { status: 400 });
    }

    // Convert stringified fields back to BigInt
    const refinedUserOp = parseUserOpWithBigInt(userOp);

    // Execute the transaction via the AAService on the server
    const txHash = await AAService.execute(refinedUserOp, authorization);

    return NextResponse.json({ txHash });
  } catch (error: unknown) {
    console.error("[API] AA Execution error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to execute transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
