import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { monitorAllPositions } from "@/services/api/position-monitor.service";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Constant-time comparison for secrets to prevent timing attacks.
 */
function safeCompareSecret(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) {
      timingSafeEqual(aBuf, aBuf); // consume constant time
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/**
 * GET /api/cron/monitor-positions
 *
 * Monitors all VaultX users' Morpho positions and triggers automatic
 * migration to Fluid when borrowing rates are more favorable.
 *
 * Auth: CRON_SECRET via Authorization: Bearer <secret>
 * Runs every 10 minutes via GitHub Actions / Vercel Cron.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET env var is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!safeCompareSecret(providedSecret, cronSecret)) {
    audit({
      event: "auth_failure",
      details: { endpoint: "/api/cron/monitor-positions" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting position monitoring run...");
    const summary = await monitorAllPositions();

    console.log(
      `[Cron] Completed — checked: ${summary.usersChecked}, migrated: ${summary.migrationsTriggered}, skipped: ${summary.skipped}, errors: ${summary.errors}`,
    );

    return NextResponse.json({
      success: true,
      summary: {
        usersChecked: summary.usersChecked,
        migrationsTriggered: summary.migrationsTriggered,
        skipped: summary.skipped,
        errors: summary.errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Monitor failed";
    console.error("[Cron] Monitor error:", message);
    audit({
      event: "offline_execution_failed",
      details: { error: message, action: "cron-monitor" },
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
