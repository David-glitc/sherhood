import { getDb, mongoConfigured } from "@/lib/mongo"

export type PoolNameDoc = {
  address: string
  name: string
  creator?: string
  updatedAt: number
}

const COLLECTION = "pool_names"

export async function getPoolNamesMap(): Promise<Record<string, string>> {
  if (!mongoConfigured()) return {}
  const db = await getDb()
  const rows = await db
    .collection<PoolNameDoc>(COLLECTION)
    .find({})
    .project({ address: 1, name: 1 })
    .toArray()
  const out: Record<string, string> = {}
  for (const row of rows) {
    if (row.address && row.name) out[row.address.toLowerCase()] = row.name.trim()
  }
  return out
}

export async function setPoolName(
  address: string,
  name: string,
  creator?: string
): Promise<void> {
  if (!mongoConfigured()) return
  const db = await getDb()
  const key = address.toLowerCase()
  const clean = name.trim().slice(0, 48)
  if (!clean) return
  await db.collection<PoolNameDoc>(COLLECTION).updateOne(
    { address: key },
    {
      $set: {
        address: key,
        name: clean,
        ...(creator ? { creator: creator.toLowerCase() } : {}),
        updatedAt: Date.now(),
      },
    },
    { upsert: true }
  )
}
