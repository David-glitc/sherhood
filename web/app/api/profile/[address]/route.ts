import { NextResponse } from "next/server"
import { isAddress } from "viem"
import { potFactoryConfig } from "@/lib/contracts"
import { scoreWallets, type ProfileActivityItem } from "@/lib/xp"
import { mergeXpEvents } from "@/lib/xp-event-id"
import { indexWalletFromChain } from "@/lib/xp-chain"
import {
  getCachedProfileStats,
  getWalletXpEvents,
  getWalletRank,
  getWalletScore,
  saveProfileStats,
  saveWalletScore,
  upsertXpEvents,
} from "@/lib/xp-store"

export const dynamic = "force-dynamic"

export type { ProfileActivityItem } from "@/lib/xp"

function mergeActivity(
  a: ProfileActivityItem[],
  b: ProfileActivityItem[]
): ProfileActivityItem[] {
  const map = new Map<string, ProfileActivityItem>()
  for (const item of [...a, ...b]) {
    const key = [
      item.kind,
      String(item.at),
      (item.pot ?? "").toLowerCase(),
      item.tokenId ?? "",
      item.blockNumber ?? "",
    ].join("|")
    map.set(key, item)
  }
  return Array.from(map.values()).sort((x, y) => y.at - x.at)
}

function timelineFromActivity(activity: ProfileActivityItem[]): { t: number; v: string }[] {
  const depositByToken = new Map<string, bigint>()
  let running = 0n
  const timeline: { t: number; v: string }[] = []
  for (const item of [...activity].sort((a, b) => a.at - b.at)) {
    if (item.kind === "deposit" && item.amount) {
      running += BigInt(item.amount)
      if (item.tokenId) depositByToken.set(item.tokenId, BigInt(item.amount))
    } else if (item.kind === "early_exit" && item.tokenId) {
      running -= depositByToken.get(item.tokenId) ?? 0n
      depositByToken.delete(item.tokenId)
    } else if (item.kind === "claim" && item.tokenId) {
      running -= depositByToken.get(item.tokenId) ?? 0n
      depositByToken.delete(item.tokenId)
    } else {
      continue
    }
    if (running < 0n) running = 0n
    timeline.push({ t: item.at, v: running.toString() })
  }
  return timeline
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params
  if (!isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 })
  }
  const wallet = address as `0x${string}`

  if (potFactoryConfig.address === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({
      activity: [],
      xp: 0,
      streak: 0,
      actions: 0,
      createdPots: [],
      rank: null,
      timeline: [],
    })
  }

  const fresh = await getCachedProfileStats(wallet)
  if (fresh) {
    const rank = fresh.rank ?? (await getWalletRank(wallet))
    const storedEvents = await getWalletXpEvents(wallet)
    const board = await getWalletScore(wallet)
    const scored = storedEvents.length > 0 ? scoreWallets(storedEvents)[0] : null
    const xp = Math.max(scored?.xp ?? 0, fresh.xp ?? 0, board?.xp ?? 0)
    const streak = scored?.streak ?? board?.streak ?? fresh.streak
    const actions = Math.max(scored?.actions ?? 0, fresh.actions ?? 0, board?.actions ?? 0)
    return NextResponse.json(
      {
        activity: fresh.activity,
        xp,
        streak,
        actions,
        timeline: fresh.timeline,
        createdPots: fresh.createdPots ?? [],
        rank,
        updatedAt: fresh.updatedAt,
        source: "db",
        eventCount: storedEvents.length || undefined,
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=90" } }
    )
  }

  const stale = await getCachedProfileStats(wallet, { allowStale: true })
  const storedEvents = await getWalletXpEvents(wallet)
  const board = await getWalletScore(wallet)

  try {
    const chain = await indexWalletFromChain(wallet)
    const mergedEvents = mergeXpEvents(storedEvents, chain.xpEvents)
    void upsertXpEvents(chain.xpEvents)

    const score = scoreWallets(mergedEvents)[0]
    const rank = await getWalletRank(wallet)
    const activity = mergeActivity(stale?.activity ?? [], chain.activity).slice(0, 100)
    const createdPots = Array.from(
      new Set([...(stale?.createdPots ?? []), ...chain.createdPots])
    )
    const timeline =
      chain.timeline.length > 0
        ? chain.timeline
        : timelineFromActivity(activity)

    const xp = Math.max(score?.xp ?? 0, board?.xp ?? 0, stale?.xp ?? 0)
    const actions = Math.max(score?.actions ?? 0, board?.actions ?? 0, stale?.actions ?? 0)
    const streak = score?.streak ?? board?.streak ?? stale?.streak ?? 0

    const payload = {
      activity,
      xp,
      streak,
      actions,
      timeline,
      createdPots,
      rank,
    }

    // Never persist a zero wipe over known-good history.
    const priorXp = Math.max(stale?.xp ?? 0, board?.xp ?? 0, scoreWallets(storedEvents)[0]?.xp ?? 0)
    if (payload.xp > 0 || priorXp === 0) {
      void saveProfileStats({
        address: wallet,
        ...payload,
      })
      if (score && score.xp > 0) {
        void saveWalletScore(score)
      }
    }

    return NextResponse.json(
      {
        ...payload,
        updatedAt: Date.now(),
        source: "chain",
        eventCount: mergedEvents.length,
      },
      { headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=120" } }
    )
  } catch (e) {
    // Chain failed — serve scored DB events / board / stale — never invent a reset.
    if (storedEvents.length > 0) {
      const score = scoreWallets(storedEvents)[0]
      const rank = await getWalletRank(wallet)
      return NextResponse.json(
        {
          activity: stale?.activity ?? [],
          xp: Math.max(score?.xp ?? 0, board?.xp ?? 0, stale?.xp ?? 0),
          streak: score?.streak ?? board?.streak ?? stale?.streak ?? 0,
          actions: Math.max(score?.actions ?? 0, board?.actions ?? 0, stale?.actions ?? 0),
          timeline: stale?.timeline ?? [],
          createdPots: stale?.createdPots ?? [],
          rank,
          updatedAt: stale?.updatedAt ?? Date.now(),
          source: "events",
          eventCount: storedEvents.length,
          warning: e instanceof Error ? e.message : "chain unavailable",
        },
        { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
      )
    }

    if (board && board.xp > 0) {
      const rank = await getWalletRank(wallet)
      return NextResponse.json(
        {
          activity: stale?.activity ?? [],
          xp: board.xp,
          streak: board.streak,
          actions: board.actions,
          timeline: stale?.timeline ?? [],
          createdPots: stale?.createdPots ?? [],
          rank,
          updatedAt: stale?.updatedAt ?? Date.now(),
          source: "board",
          warning: e instanceof Error ? e.message : "chain unavailable",
        },
        { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
      )
    }

    if (stale && (stale.xp > 0 || stale.actions > 0)) {
      const rank = stale.rank ?? (await getWalletRank(wallet))
      return NextResponse.json(
        {
          activity: stale.activity,
          xp: stale.xp,
          streak: stale.streak,
          actions: stale.actions,
          timeline: stale.timeline,
          createdPots: stale.createdPots ?? [],
          rank,
          updatedAt: stale.updatedAt,
          source: "stale",
          warning: e instanceof Error ? e.message : "chain unavailable",
        },
        { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
      )
    }

    return NextResponse.json(
      {
        activity: [],
        xp: 0,
        streak: 0,
        actions: 0,
        timeline: [],
        createdPots: [],
        rank: null,
        error: e instanceof Error ? e.message : "profile unavailable",
      },
      { status: 200 }
    )
  }
}
