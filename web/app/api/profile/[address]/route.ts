import { NextResponse } from "next/server"
import { isAddress, parseAbiItem } from "viem"
import { potFactoryConfig, marketplaceConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { scoreWallets, XP_REWARDS, type XpEvent } from "@/lib/xp"

export const dynamic = "force-dynamic"

const depositedEvent = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 entryFeePaid, uint256 indexed tokenId)"
)
const claimedEvent = parseAbiItem(
  "event Claimed(address indexed user, uint256 indexed tokenId, address[] tokens, uint256[] payouts)"
)
const earlyExitedEvent = parseAbiItem(
  "event EarlyExited(address indexed user, uint256 indexed tokenId, uint256 depositAmount, uint256 fee, uint256 refund)"
)
const potCreatedEvent = parseAbiItem(
  "event PotCreated(address indexed pot, address indexed creator, uint256 fundingGoal, uint256 deadline, uint256 minDeposit, uint256 entryFee, uint256 protocolFeeBps, bool community)"
)
const soldEvent = parseAbiItem(
  "event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royalty)"
)
const listedEvent = parseAbiItem(
  "event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)"
)
const listingCancelledEvent = parseAbiItem(
  "event Cancelled(uint256 indexed tokenId, address indexed seller)"
)

export type ProfileActivityItem = {
  kind:
    | "deposit"
    | "claim"
    | "early_exit"
    | "create"
    | "buy"
    | "sell"
    | "list"
    | "delist"
  at: number
  pot?: string
  tokenId?: string
  amount?: string
  xp: number
  blockNumber: string
}

const blockTimeCache = new Map<string, number>()

async function blockTime(blockNumber: bigint): Promise<number> {
  const key = blockNumber.toString()
  const cached = blockTimeCache.get(key)
  if (cached !== undefined) return cached
  const block = await rhPublicClient.getBlock({ blockNumber })
  const at = Number(block.timestamp)
  blockTimeCache.set(key, at)
  return at
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
    return NextResponse.json({ activity: [], xp: 0, streak: 0, timeline: [] })
  }

  try {
    const latest = await rhPublicClient.getBlockNumber()
    const fromBlock = latest > 500_000n ? latest - 500_000n : 0n

    const pots = (await rhPublicClient.readContract({
      ...potFactoryConfig,
      functionName: "getPots",
      args: [],
    })) as `0x${string}`[]

    const activity: ProfileActivityItem[] = []
    const sample = pots.slice(-40)

    const [createdLogs, ...potLogBatches] = await Promise.all([
      rhPublicClient.getLogs({
        address: potFactoryConfig.address,
        event: potCreatedEvent,
        args: { creator: wallet },
        fromBlock,
        toBlock: latest,
      }),
      ...sample.map((pot) =>
        Promise.all([
          rhPublicClient.getLogs({
            address: pot,
            event: depositedEvent,
            args: { user: wallet },
            fromBlock,
            toBlock: latest,
          }),
          rhPublicClient.getLogs({
            address: pot,
            event: claimedEvent,
            args: { user: wallet },
            fromBlock,
            toBlock: latest,
          }),
          rhPublicClient.getLogs({
            address: pot,
            event: earlyExitedEvent,
            args: { user: wallet },
            fromBlock,
            toBlock: latest,
          }),
        ])
      ),
    ])

    for (const log of createdLogs) {
      activity.push({
        kind: "create",
        at: await blockTime(log.blockNumber),
        pot: (log.args as { pot?: string }).pot,
        xp: XP_REWARDS.create,
        blockNumber: log.blockNumber.toString(),
      })
    }

    for (let i = 0; i < sample.length; i++) {
      const [deps, claims, exits] = potLogBatches[i]
      for (const log of deps) {
        activity.push({
          kind: "deposit",
          at: await blockTime(log.blockNumber),
          pot: sample[i],
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { amount?: bigint }).amount ?? 0n),
          xp: XP_REWARDS.deposit,
          blockNumber: log.blockNumber.toString(),
        })
      }
      for (const log of claims) {
        activity.push({
          kind: "claim",
          at: await blockTime(log.blockNumber),
          pot: sample[i],
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          xp: XP_REWARDS.claim,
          blockNumber: log.blockNumber.toString(),
        })
      }
      for (const log of exits) {
        activity.push({
          kind: "early_exit",
          at: await blockTime(log.blockNumber),
          pot: sample[i],
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { refund?: bigint }).refund ?? 0n),
          xp: XP_REWARDS.early_exit,
          blockNumber: log.blockNumber.toString(),
        })
      }
    }

    if (marketplaceConfig.address !== "0x0000000000000000000000000000000000000000") {
      const [asSeller, asBuyer, listings, cancellations] = await Promise.all([
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: soldEvent,
          args: { seller: wallet },
          fromBlock,
          toBlock: latest,
        }),
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: soldEvent,
          args: { buyer: wallet },
          fromBlock,
          toBlock: latest,
        }),
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: listedEvent,
          args: { seller: wallet },
          fromBlock,
          toBlock: latest,
        }),
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: listingCancelledEvent,
          args: { seller: wallet },
          fromBlock,
          toBlock: latest,
        }),
      ])
      for (const log of asSeller) {
        activity.push({
          kind: "sell",
          at: await blockTime(log.blockNumber),
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { price?: bigint }).price ?? 0n),
          xp: XP_REWARDS.sell,
          blockNumber: log.blockNumber.toString(),
        })
      }
      for (const log of asBuyer) {
        activity.push({
          kind: "buy",
          at: await blockTime(log.blockNumber),
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { price?: bigint }).price ?? 0n),
          xp: XP_REWARDS.buy,
          blockNumber: log.blockNumber.toString(),
        })
      }
      for (const log of listings) {
        activity.push({
          kind: "list",
          at: await blockTime(log.blockNumber),
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { price?: bigint }).price ?? 0n),
          xp: 0,
          blockNumber: log.blockNumber.toString(),
        })
      }
      for (const log of cancellations) {
        activity.push({
          kind: "delist",
          at: await blockTime(log.blockNumber),
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          xp: 0,
          blockNumber: log.blockNumber.toString(),
        })
      }
    }

    activity.sort((a, b) => b.at - a.at)

    // Score XP/streak from XP-bearing actions only (list/delist give no XP).
    const xpEvents: XpEvent[] = activity
      .filter((a) => a.xp > 0)
      .map((a) => ({
        kind: a.kind as XpEvent["kind"],
        wallet,
        at: a.at,
        pot: a.pot,
        tokenId: a.tokenId,
        xp: a.xp,
      }))
    const score = scoreWallets(xpEvents)[0]

    // Portfolio timeline: cumulative net USDG principal in baskets over time.
    // Deposits add; exits subtract the refunded amount; claims zero the card's
    // deposit (deposit amount is matched by tokenId when available).
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

    return NextResponse.json(
      {
        activity: activity.slice(0, 100),
        xp: score?.xp ?? 0,
        streak: score?.streak ?? 0,
        actions: score?.actions ?? 0,
        timeline,
        updatedAt: Date.now(),
      },
      { headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=120" } }
    )
  } catch (e) {
    return NextResponse.json(
      {
        activity: [],
        xp: 0,
        streak: 0,
        actions: 0,
        timeline: [],
        error: e instanceof Error ? e.message : "profile unavailable",
      },
      { status: 200 }
    )
  }
}
