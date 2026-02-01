import { NextResponse } from "next/server";
import {
  AAService,
  parseUserOpWithBigInt,
} from "@/services/account-abstraction";

export async function POST(req: Request) {
  try {
    const { userOp, authorization } = await req.json();

    if (!userOp) {
      return NextResponse.json({ error: "Missing userOp" }, { status: 400 });
    }

    // Convert stringified fields back to BigInt
    const refinedUserOp = parseUserOpWithBigInt(userOp);

    // Execute the transaction via the AAService on the server
    const txHash = await AAService.execute(refinedUserOp, authorization);

    return NextResponse.json({ txHash });
  } catch (error: any) {
    console.error("[API] AA Execution error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute transaction" },
      { status: 500 },
    );
  }
}
