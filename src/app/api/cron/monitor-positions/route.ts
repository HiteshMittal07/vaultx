import { NextRequest, NextResponse } from "next/server";
import { monitorAllPositions } from "@/services/api/position-monitor.service";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/monitor-positions
 *
 * Vercel Cron endpoint that monitors all VaultX users' Morpho positions
 * and triggers automatic rebalancing when LTV exceeds the threshold.
 *
 * Runs every 5 minutes via Vercel Cron.
 * Auth: CRON_SECRET (Vercel sets this automatically for cron jobs).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET env var is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    audit({ event: "auth_failure", details: { endpoint: "/api/cron/monitor-positions" } });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting position monitoring run...");
    const summary = await monitorAllPositions();

    console.log(
      `[Cron] Completed — checked: ${summary.usersChecked}, rebalanced: ${summary.rebalancesTriggered}, skipped: ${summary.skipped}, errors: ${summary.errors}`
    );

    return NextResponse.json({
      success: true,
      summary: {
        usersChecked: summary.usersChecked,
        rebalancesTriggered: summary.rebalancesTriggered,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
