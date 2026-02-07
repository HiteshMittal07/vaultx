import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

let client: MongoClient;
let db: Db;

export async function getDb(): Promise<Db> {
  if (db) return db;

  if (!client) {
    client = new MongoClient(MONGODB_URI!);
    await client.connect();
  }

  db = client.db();
  return db;
}
