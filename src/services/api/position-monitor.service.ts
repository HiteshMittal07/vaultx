import { Address } from "viem";
import { getDb } from "@/lib/mongodb";
import { getMorphoMarketData, getOraclePrice } from "@/lib/blockchain/utils";
import {
  parseUserPosition,
  parseLLTV,
  computePositionMetrics,
} from "@/lib/calculations";
import { buildMigrationCalls } from "@/services/api/migration.service";
import { validateCallsAgainstPolicy } from "@/services/api/policy.service";
import { executeOffline } from "@/services/account-abstraction/offline.service";
import { audit } from "@/lib/audit";

// ─── Configurable Thresholds ────────────────────────────────────
// Market LLTV is 77% — trigger migration at 60% LTV
// which gives a 17% buffer before liquidation.

/** LTV percentage above which migration is triggered */
const LTV_MIGRATE_THRESHOLD = 60;

/** Minimum time between migrations per user (1 hour) */
const MIGRATION_COOLDOWN_MS = 60 * 60 * 1000;

/** Maximum users to process per cron invocation */
const MAX_USERS_PER_RUN = 10;

// ─── Types ──────────────────────────────────────────────────────

export interface MonitorSummary {
  usersChecked: number;
  migrationsTriggered: number;
  skipped: number;
  errors: number;
  details: MonitorDetail[];
}

interface MonitorDetail {
  address: string;
  action: "migrated" | "skipped" | "error" | "healthy";
  reason?: string;
  ltvBefore?: number;
  txHash?: string;
}

// ─── User Discovery ─────────────────────────────────────────────

/**
 * Finds all users who have interacted with VaultX's borrow market
 * by querying distinct wallet addresses from transaction_history.
 */
async function getMonitoredUsers(): Promise<string[]> {
  const db = await getDb();
  const addresses = await db
    .collection("transaction_history")
    .distinct("walletAddress", {
      action: { $in: ["supply", "borrow"] },
    });
  return addresses;
}

// ─── Cooldown Check ─────────────────────────────────────────────

/**
 * Checks if a user was recently migrated (within cooldown period).
 */
async function isOnCooldown(walletAddress: string): Promise<boolean> {
  const db = await getDb();
  const recent = await db.collection("migration_log").findOne(
    {
      walletAddress: walletAddress.toLowerCase(),
      action: "migrated",
      timestamp: { $gte: new Date(Date.now() - MIGRATION_COOLDOWN_MS) },
    },
    { sort: { timestamp: -1 } },
  );
  return !!recent;
}

// ─── Position Health Check ──────────────────────────────────────

/**
 * Checks a single user's position health and returns whether
 * migration is needed.
 */
async function checkPositionHealth(userAddress: Address): Promise<{
  needsMigration: boolean;
  hasPosition: boolean;
  currentLTV: number;
  userCollateral: number;
  userBorrow: number;
  oraclePrice: number;
  lltv: number;
}> {
  const { params, state, position } = await getMorphoMarketData(userAddress);

  if (!params || !state || !position) {
    return {
      needsMigration: false,
      hasPosition: false,
      currentLTV: 0,
      userCollateral: 0,
      userBorrow: 0,
      oraclePrice: 0,
      lltv: 0,
    };
  }

  const posArr = position as unknown as readonly bigint[];
  const stateArr = state as unknown as readonly bigint[];
  const paramsArr = params as unknown as readonly unknown[];

  const { userCollateral, userBorrow } = parseUserPosition(posArr, stateArr);
  const lltv = parseLLTV(paramsArr);
  const oraclePrice = await getOraclePrice(params);

  const hasPosition = userCollateral > 0 && userBorrow > 0;

  const { currentLTV } = computePositionMetrics(
    userCollateral,
    userBorrow,
    oraclePrice,
    lltv,
  );

  return {
    needsMigration: hasPosition && currentLTV > LTV_MIGRATE_THRESHOLD,
    hasPosition,
    currentLTV,
    userCollateral,
    userBorrow,
    oraclePrice,
    lltv,
  };
}

// ─── Logging ────────────────────────────────────────────────────

async function logMigrationResult(entry: {
  walletAddress: string;
  action: "migrated" | "skipped" | "error";
  ltvBefore?: number;
  debtMigrated?: number;
  collateralMigrated?: number;
  txHash?: string;
  error?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("migration_log").insertOne({
      ...entry,
      walletAddress: entry.walletAddress.toLowerCase(),
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("[Monitor] Failed to log migration result:", err);
  }
}

// ─── Main Monitor ───────────────────────────────────────────────

/**
 * Monitors all VaultX users' positions and triggers migration
 * for any that exceed the LTV threshold.
 */
export async function monitorAllPositions(): Promise<MonitorSummary> {
  const summary: MonitorSummary = {
    usersChecked: 0,
    migrationsTriggered: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const users = await getMonitoredUsers();
  const usersToProcess = users.slice(0, MAX_USERS_PER_RUN);

  for (const walletAddress of usersToProcess) {
    summary.usersChecked++;

    try {
      // Check cooldown
      if (await isOnCooldown(walletAddress)) {
        summary.skipped++;
        summary.details.push({
          address: walletAddress,
          action: "skipped",
          reason: "On cooldown",
        });
        continue;
      }

      // Check health
      const health = await checkPositionHealth(walletAddress as Address);

      if (!health.hasPosition) {
        summary.details.push({
          address: walletAddress,
          action: "skipped",
          reason: "No active position",
        });
        summary.skipped++;
        continue;
      }

      if (!health.needsMigration) {
        summary.details.push({
          address: walletAddress,
          action: "healthy",
          ltvBefore: health.currentLTV,
        });
        continue;
      }

      // Position needs migration
      console.log(
        `[Monitor] Migrating ${walletAddress} — LTV: ${health.currentLTV.toFixed(2)}%`,
      );

      const { calls, calculation } = await buildMigrationCalls({
        userAddress: walletAddress as Address,
      });

      // Validate against policy
      const policyCheck = validateCallsAgainstPolicy(calls);
      if (!policyCheck.valid) {
        audit({
          event: "policy_violation",
          userAddress: walletAddress,
          action: "migrate",
          details: { error: policyCheck.error },
        });
        await logMigrationResult({
          walletAddress,
          action: "error",
          ltvBefore: health.currentLTV,
          error: `Policy violation: ${policyCheck.error}`,
        });
        summary.errors++;
        summary.details.push({
          address: walletAddress,
          action: "error",
          reason: `Policy violation: ${policyCheck.error}`,
          ltvBefore: health.currentLTV,
        });
        continue;
      }

      // Execute atomically
      const { txHash } = await executeOffline(walletAddress as Address, calls);

      // Log to transaction_history
      try {
        const db = await getDb();
        await db.collection("transaction_history").insertOne({
          walletAddress: walletAddress.toLowerCase(),
          action: "migrate",
          txHash,
          executedBy: "vaultx-agent",
          status: "success",
          debtMigrated: calculation.debtToRepay,
          collateralMigrated: calculation.collateralToMigrate,
          borrowOnFluid: calculation.borrowOnFluid,
          ltvBefore: calculation.currentLTV,
          oraclePrice: calculation.oraclePrice,
          timestamp: new Date(),
        });
      } catch (historyErr) {
        console.error("[Monitor] Failed to save history:", historyErr);
      }

      // Log to migration_log for cooldown tracking
      await logMigrationResult({
        walletAddress,
        action: "migrated",
        ltvBefore: calculation.currentLTV,
        debtMigrated: calculation.debtToRepay,
        collateralMigrated: calculation.collateralToMigrate,
        txHash,
      });

      audit({
        event: "offline_execution",
        userAddress: walletAddress,
        action: "migrate",
        details: {
          txHash,
          ltvBefore: calculation.currentLTV,
          debtMigrated: calculation.debtToRepay,
          collateralMigrated: calculation.collateralToMigrate,
        },
      });

      summary.migrationsTriggered++;
      summary.details.push({
        address: walletAddress,
        action: "migrated",
        ltvBefore: calculation.currentLTV,
        txHash,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Monitor] Error processing ${walletAddress}:`, errorMsg);

      await logMigrationResult({
        walletAddress,
        action: "error",
        error: errorMsg,
      });

      audit({
        event: "offline_execution_failed",
        userAddress: walletAddress,
        action: "migrate",
        details: { error: errorMsg },
      });

      summary.errors++;
      summary.details.push({
        address: walletAddress,
        action: "error",
        reason: errorMsg,
      });
    }
  }

  return summary;
}
