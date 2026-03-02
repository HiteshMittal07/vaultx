/**
 * One-time script to create MongoDB indexes for production performance.
 *
 * Run once after deploying or when setting up a new environment:
 *   pnpm tsx scripts/init-db-indexes.ts
 *
 * Safe to re-run — MongoDB createIndex is idempotent.
 */

import "dotenv/config";
import { ensureIndexes } from "../src/lib/mongodb";

async function main() {
  console.log("Creating MongoDB indexes...");
  await ensureIndexes();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create indexes:", err);
  process.exit(1);
});
