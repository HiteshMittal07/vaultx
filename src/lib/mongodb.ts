import { MongoClient, Db } from "mongodb";

// ─── Connection ───────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;

// Defer the hard error to runtime rather than module-load time so that
// Next.js can boot and return a useful 500 error rather than crashing.
function getUri(): string {
  if (!MONGODB_URI) {
    throw new Error(
      "[MongoDB] MONGODB_URI environment variable is not set. " +
      "Check your .env file or deployment environment variables."
    );
  }
  return MONGODB_URI;
}

// Cache the client promise on globalThis so it survives Next.js HMR
// and doesn't create new connections on every hot reload.
const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(getUri(), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 10_000,
    });
    globalForMongo._mongoClientPromise = client.connect();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

// ─── Index Initialization (call once at startup or via script) ────────────────

/**
 * Creates the indexes required for production query performance.
 * Safe to call multiple times — MongoDB createIndex is idempotent.
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  await Promise.all([
    // transaction_history: primary query pattern is walletAddress + sort by timestamp
    db.collection("transaction_history").createIndex(
      { walletAddress: 1, timestamp: -1 },
      { background: true }
    ),
    // transaction_history: unique txHash lookup
    db.collection("transaction_history").createIndex(
      { txHash: 1 },
      { unique: false, background: true }
    ),
    // audit_log: time-range queries + event filtering
    db.collection("audit_log").createIndex(
      { timestamp: -1 },
      { background: true }
    ),
    db.collection("audit_log").createIndex(
      { event: 1, timestamp: -1 },
      { background: true }
    ),
    db.collection("audit_log").createIndex(
      { userAddress: 1, timestamp: -1 },
      { background: true, sparse: true }
    ),
    // migration_log: user + time
    db.collection("migration_log").createIndex(
      { walletAddress: 1, timestamp: -1 },
      { background: true }
    ),
  ]);

  console.log("[MongoDB] Indexes ensured.");
}
