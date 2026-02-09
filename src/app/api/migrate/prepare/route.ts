import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import {
  buildMigrationCalls,
  MigrationRequest,
} from "@/services/api/migration.service";
import { validateCallsAgainstPolicy } from "@/services/api/policy.service";

/**
 * POST /api/migrate/prepare
 *
 * Prepares a Morpho→Fluid migration UserOp.
 * Returns the calls array + calculation for the frontend to review
 * before signing via Privy.
 *
 * Request body:
 * {
 *   userAddress: "0x...",
 *   fluidNftId?: "0",         // optional: existing Fluid position NFT ID
 *   borrowBufferBps?: 0       // optional: reduce Fluid borrow by N basis points
 * }
 *
 * Response:
 * {
 *   calls: Call[],
 *   calculation: { debtToRepay, collateralToMigrate, borrowOnFluid, ... },
 *   requiresUserSignature: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userAddress) {
      return NextResponse.json(
        { error: "userAddress is required" },
        { status: 400 },
      );
    }

    const migrationRequest: MigrationRequest = {
      userAddress: body.userAddress as Address,
      fluidNftId: body.fluidNftId ? BigInt(body.fluidNftId) : BigInt(0),
      borrowBufferBps: body.borrowBufferBps ?? 0,
    };

    // Build the 3 migration calls
    const { calls, calculation } = await buildMigrationCalls(migrationRequest);

    // Validate against policy
    const policyCheck = validateCallsAgainstPolicy(calls);
    if (!policyCheck.valid) {
      return NextResponse.json(
        { error: `Policy violation: ${policyCheck.error}` },
        { status: 403 },
      );
    }

    // Migrations always require user signature (position value typically > $1000)
    return NextResponse.json({
      calls,
      calculation,
      requiresUserSignature: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Migration preparation failed";
    console.error("Error in /api/migrate/prepare:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
