import { getDb, mongoConfigured } from "@/lib/mongo"

const CURSOR_ID = "tg_broadcast"

export type TgCursor = {
  _id: string
  lastBlock: string
  updatedAt: number
}

export async function getTgCursor(): Promise<bigint | null> {
  if (!mongoConfigured()) return null
  const db = await getDb()
  const row = await db.collection<TgCursor>("tg_cursor").findOne({ _id: CURSOR_ID })
  if (!row?.lastBlock) return null
  return BigInt(row.lastBlock)
}

export async function setTgCursor(block: bigint): Promise<void> {
  if (!mongoConfigured()) return
  const db = await getDb()
  await db.collection<TgCursor>("tg_cursor").updateOne(
    { _id: CURSOR_ID },
    {
      $set: {
        _id: CURSOR_ID,
        lastBlock: block.toString(),
        updatedAt: Date.now(),
      },
    },
    { upsert: true }
  )
}
