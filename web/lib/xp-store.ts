import type { Collection } from "mongodb"
import { getDb, mongoConfigured } from "@/lib/mongo"
import {
  prevDay,
  utcTodayKey,
  type WalletScore,
  type XpEvent,
  type ProfileActivityItem,
} from "@/lib/xp"
import { xpEventId } from "@/lib/xp-event-id"
import { isProtocolOpsWallet, PROTOCOL_OPS_WALLETS } from "@/lib/protocol-ops"

const SCORE_TTL_MS = 5 * 60_000
const PROFILE_STATS_TTL_MS = 5 * 60_000

type StoredXpEvent = XpEvent & { id: string; updatedAt: number }

export type StoredWalletScore = WalletScore & {
  updatedAt: number
}

export type StoredProfileStats = {
  address: string
  activity: ProfileActivityItem[]
  xp: number
  streak: number
  actions: number
  timeline: { t: number; v: string }[]
  createdPots?: string[]
  rank?: number | null
  updatedAt: number
}

declare global {
  var __sherhoodXpIndexes: Promise<void> | undefined
}

const OPS_WALLET_FILTER = {
  wallet: { $nin: [...PROTOCOL_OPS_WALLETS] },
  xp: { $gt: 0 },
} as const

async function scoresCol(): Promise<Collection<StoredWalletScore>> {
  const db = await getDb()
  const col = db.collection<StoredWalletScore>("wallet_scores")
  if (!globalThis.__sherhoodXpIndexes) {
    globalThis.__sherhoodXpIndexes = Promise.all([
      col.createIndex({ wallet: 1 }, { unique: true }),
      col.createIndex({ xp: -1 }),
      col.createIndex({ updatedAt: -1 }),
      db.collection("profile_stats").createIndex({ address: 1 }, { unique: true }),
      db.collection("xp_events").createIndex({ id: 1 }, { unique: true }),
      db.collection("xp_events").createIndex({ wallet: 1, at: -1 }),
      db.collection("xp_events").createIndex({ wallet: 1, kind: 1, at: 1 }),
    ]).then(() => undefined)
  }
  await globalThis.__sherhoodXpIndexes.catch(() => undefined)
  return col
}

async function statsCol(): Promise<Collection<StoredProfileStats>> {
  const db = await getDb()
  return db.collection<StoredProfileStats>("profile_stats")
}

async function eventsCol(): Promise<Collection<StoredXpEvent>> {
  // Ensure indexes via scoresCol bootstrap
  await scoresCol()
  const db = await getDb()
  return db.collection("xp_events")
}

/** All persisted XP events for a wallet (source of truth across flaky RPC). */
export async function getWalletXpEvents(address: string): Promise<XpEvent[]> {
  if (!mongoConfigured()) return []
  try {
    const col = await eventsCol()
    const rows = await col
      .find({ wallet: address.toLowerCase() })
      .sort({ at: 1 })
      .toArray()
    return rows.map(({ wallet, kind, at, pot, tokenId, xp }) => ({
      wallet,
      kind,
      at,
      pot,
      tokenId,
      xp,
    }))
  } catch {
    return []
  }
}

/** Upsert events by deterministic id — never lose history on a partial chain pull. */
export async function upsertXpEvents(events: XpEvent[]): Promise<void> {
  if (!mongoConfigured() || events.length === 0) return
  try {
    const col = await eventsCol()
    const now = Date.now()
    await col.bulkWrite(
      events.map((e) => {
        const wallet = e.wallet.toLowerCase()
        const id = xpEventId({ ...e, wallet })
        return {
          updateOne: {
            filter: { id },
            update: {
              $set: {
                id,
                wallet,
                kind: e.kind,
                at: e.at,
                pot: e.pot,
                tokenId: e.tokenId,
                xp: e.xp,
                updatedAt: now,
              },
            },
            upsert: true,
          },
        }
      }),
      { ordered: false }
    )
  } catch {
    /* non-fatal */
  }
}

/** Re-apply streak expiry on cached rows (TTL can outlive a missed UTC day). */
function streakFromCached(lastDay: string, streak: number): number {
  if (!lastDay || streak <= 0) return 0
  const today = utcTodayKey()
  const yesterday = prevDay(today)
  if (lastDay !== today && lastDay !== yesterday) return 0
  return streak
}

function mapLeaderboardRows(
  rows: StoredWalletScore[]
): { leaderboard: WalletScore[]; events: number; updatedAt: number } {
  const newest = Math.max(...rows.map((r) => r.updatedAt || 0), 0)
  return {
    leaderboard: rows.map(({ wallet, xp, actions, streak, lastDay }) => ({
      wallet,
      xp,
      actions,
      streak: streakFromCached(lastDay, streak),
      lastDay,
    })),
    events: rows.reduce((n, r) => n + (r.actions || 0), 0),
    updatedAt: newest,
  }
}

export async function getCachedLeaderboard(
  limit = 50,
  opts?: { allowStale?: boolean }
): Promise<{ leaderboard: WalletScore[]; events: number; updatedAt: number } | null> {
  if (!mongoConfigured()) return null
  try {
    const col = await scoresCol()
    // Exclude protocol wallets and zero-XP rows before the limit so they never
    // consume public board slots.
    const rows = await col
      .find(OPS_WALLET_FILTER)
      .sort({ xp: -1 })
      .limit(limit)
      .toArray()
    if (rows.length === 0) return null
    const newest = Math.max(...rows.map((r) => r.updatedAt || 0))
    if (!opts?.allowStale && Date.now() - newest > SCORE_TTL_MS) return null
    return mapLeaderboardRows(rows)
  } catch {
    return null
  }
}

/** Rank among public scores (1-based). null if wallet not on the public board. */
export async function getWalletRank(address: string): Promise<number | null> {
  if (!mongoConfigured()) return null
  try {
    if (isProtocolOpsWallet(address)) return null
    const col = await scoresCol()
    const key = address.toLowerCase()
    const me = await col.findOne({
      ...OPS_WALLET_FILTER,
      wallet: key,
    })
    if (!me || me.xp <= 0) return null
    const ahead = await col.countDocuments({
      ...OPS_WALLET_FILTER,
      xp: { $gt: me.xp },
    })
    return ahead + 1
  } catch {
    return null
  }
}

/** Single wallet score row (never drop to 0 if this exists). */
export async function getWalletScore(address: string): Promise<WalletScore | null> {
  if (!mongoConfigured()) return null
  try {
    const col = await scoresCol()
    const me = await col.findOne({ wallet: address.toLowerCase() })
    if (!me) return null
    return {
      wallet: me.wallet,
      xp: me.xp,
      actions: me.actions,
      streak: streakFromCached(me.lastDay, me.streak),
      lastDay: me.lastDay,
    }
  } catch {
    return null
  }
}

/** Upsert one wallet score from a full event-derived score. */
export async function saveWalletScore(score: WalletScore): Promise<void> {
  if (!mongoConfigured()) return
  try {
    const col = await scoresCol()
    await col.updateOne(
      { wallet: score.wallet.toLowerCase() },
      {
        $set: {
          wallet: score.wallet.toLowerCase(),
          xp: score.xp,
          actions: score.actions,
          streak: score.streak,
          lastDay: score.lastDay,
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    )
  } catch {
    /* non-fatal */
  }
}

export async function saveLeaderboard(scores: WalletScore[], events: XpEvent[]): Promise<void> {
  if (!mongoConfigured()) return
  try {
    const now = Date.now()
    const col = await scoresCol()

    if (scores.length > 0) {
      await col.bulkWrite(
        scores.map((s) => ({
          updateOne: {
            filter: { wallet: s.wallet.toLowerCase() },
            update: {
              $set: {
                wallet: s.wallet.toLowerCase(),
                xp: s.xp,
                actions: s.actions,
                streak: s.streak,
                lastDay: s.lastDay,
                updatedAt: now,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      )
    }

    if (events.length > 0) {
      await upsertXpEvents(events.slice(0, 2_000))
    }
  } catch {
    /* non-fatal cache write */
  }
}

export async function getCachedProfileStats(
  address: string,
  opts?: { allowStale?: boolean }
): Promise<StoredProfileStats | null> {
  if (!mongoConfigured()) return null
  try {
    const col = await statsCol()
    const row = await col.findOne({ address: address.toLowerCase() })
    if (!row) return null
    if (!opts?.allowStale && Date.now() - row.updatedAt > PROFILE_STATS_TTL_MS) return null
    return row
  } catch {
    return null
  }
}

export async function saveProfileStats(stats: Omit<StoredProfileStats, "updatedAt">): Promise<void> {
  if (!mongoConfigured()) return
  try {
    const col = await statsCol()
    const updatedAt = Date.now()
    await col.updateOne(
      { address: stats.address.toLowerCase() },
      {
        $set: {
          ...stats,
          address: stats.address.toLowerCase(),
          updatedAt,
        },
      },
      { upsert: true }
    )
    // Do NOT write wallet_scores here — profile indexing is wallet-scoped and
    // incomplete vs the global /api/xp pass; writing it polluted the leaderboard.
  } catch {
    /* non-fatal */
  }
}

/** Wipe off-chain account data for a wallet (profile + cached stats/events). */
export async function deleteAccountData(address: string): Promise<void> {
  if (!mongoConfigured()) {
    throw new Error("Database unavailable")
  }
  const db = await getDb()
  const key = address.toLowerCase()
  await Promise.all([
    db.collection("profiles").deleteOne({ address: key }),
    db.collection("profile_stats").deleteOne({ address: key }),
    db.collection("wallet_scores").deleteOne({ wallet: key }),
    db.collection("xp_events").deleteMany({ wallet: key }),
  ])
}
