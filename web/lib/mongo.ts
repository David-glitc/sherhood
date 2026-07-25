import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI || ""
const dbName = process.env.MONGODB_DB || "sherhood"

declare global {
  // eslint-disable-next-line no-var
  var __sherhoodMongo: {
    client: MongoClient
    db: Db
    ready: Promise<MongoClient>
  } | undefined
}

export function mongoConfigured(): boolean {
  return Boolean(uri && uri.startsWith("mongodb"))
}

/** Cached Mongo client for serverless (reuse across invocations). */
export async function getDb(): Promise<Db> {
  if (!mongoConfigured()) {
    throw new Error("MONGODB_URI is not configured")
  }

  if (!globalThis.__sherhoodMongo) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8_000,
      connectTimeoutMS: 8_000,
    })
    const ready = client.connect()
    globalThis.__sherhoodMongo = {
      client,
      db: client.db(dbName),
      ready,
    }
  }

  await globalThis.__sherhoodMongo.ready
  return globalThis.__sherhoodMongo.db
}
