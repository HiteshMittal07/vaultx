import { getDb } from "@/lib/mongodb";

type AuditEvent =
  | "offline_execution"
  | "offline_execution_failed"
  | "policy_violation"
  | "auth_failure"
  | "rate_limited";

interface AuditEntry {
  event: AuditEvent;
  userAddress?: string;
  action?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

/**
 * Logs a security-relevant event to MongoDB audit_log collection
 * and to structured console output. Fire-and-forget — never throws.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  const record = {
    ...entry,
    timestamp: new Date(),
  };

  // Structured console log (JSON for log aggregators)
  console.log(JSON.stringify({ audit: true, ...record }));

  try {
    const db = await getDb();
    await db.collection("audit_log").insertOne(record);
  } catch (err) {
    console.error("[Audit] Failed to write audit log:", err);
  }
}
