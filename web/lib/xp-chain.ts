import { getAddress, parseAbiItem } from "viem"
import { potFactoryConfig, marketplaceConfig, potCardConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { XP_REWARDS, type ProfileActivityItem, type XpEvent } from "@/lib/xp"
import { XP_INDEX_FROM_BLOCK } from "@/lib/xp-from-block"

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
const cardRevealedEvent = parseAbiItem(
  "event CardRevealed(uint256 indexed tokenId, uint256 ownershipWeight, uint8 rarity)"
)
const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
)

const AVG_BLOCK_SEC = 2

async function blockTimes(
  blockNumbers: bigint[],
  latest: bigint,
  latestTs: number
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(blockNumbers.map((b) => b.toString())))
  const map = new Map<string, number>()
  const estimate = (bn: bigint) => Math.max(0, latestTs - Number(latest - bn) * AVG_BLOCK_SEC)

  const CONCURRENCY = 12
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const slice = unique.slice(i, i + CONCURRENCY)
    await Promise.all(
      slice.map(async (key) => {
        const bn = BigInt(key)
        try {
          const block = await rhPublicClient.getBlock({ blockNumber: bn })
          map.set(key, Number(block.timestamp))
        } catch {
          map.set(key, estimate(bn))
        }
      })
    )
  }
  return map
}

function atFor(times: Map<string, number>, bn: bigint, latest: bigint, latestTs: number): number {
  return (
    times.get(bn.toString()) ?? Math.max(0, latestTs - Number(latest - bn) * AVG_BLOCK_SEC)
  )
}

export type WalletChainIndex = {
  activity: ProfileActivityItem[]
  xpEvents: XpEvent[]
  createdPots: string[]
  timeline: { t: number; v: string }[]
}

/**
 * Pull wallet-scoped XP/activity from chain. Per-pot failures are skipped
 * (never wipe the whole wallet score because one RPC call failed).
 */
export async function indexWalletFromChain(wallet: `0x${string}`): Promise<WalletChainIndex> {
  const empty: WalletChainIndex = { activity: [], xpEvents: [], createdPots: [], timeline: [] }
  if (potFactoryConfig.address === "0x0000000000000000000000000000000000000000") {
    return empty
  }

  const latestBlock = await rhPublicClient.getBlock()
  const latest = latestBlock.number
  const latestTs = Number(latestBlock.timestamp)
  const fromBlock = XP_INDEX_FROM_BLOCK
  const walletChecksum = getAddress(wallet)

  let pots: `0x${string}`[] = []
  try {
    pots = (await rhPublicClient.readContract({
      ...potFactoryConfig,
      functionName: "getPots",
      args: [],
    })) as `0x${string}`[]
  } catch {
    pots = []
  }

  const pendingBlocks: bigint[] = []
  type RawActivity = {
    kind: ProfileActivityItem["kind"]
    pot?: string
    tokenId?: string
    amount?: string
    xp: number
    blockNumber: bigint
  }
  const rawActivity: RawActivity[] = []
  const createdPots: string[] = []

  try {
    const createdLogs = await rhPublicClient.getLogs({
      address: potFactoryConfig.address,
      event: potCreatedEvent,
      args: { creator: walletChecksum },
      fromBlock,
      toBlock: latest,
    })
    for (const log of createdLogs) {
      const pot = (log.args as { pot?: string }).pot
      if (pot) createdPots.push(pot)
      rawActivity.push({
        kind: "create",
        pot,
        xp: XP_REWARDS.create,
        blockNumber: log.blockNumber,
      })
      pendingBlocks.push(log.blockNumber)
    }
  } catch {
    /* keep going */
  }

  const POT_CONCURRENCY = 6
  for (let i = 0; i < pots.length; i += POT_CONCURRENCY) {
    const batch = pots.slice(i, i + POT_CONCURRENCY)
    const results = await Promise.all(
      batch.map(async (pot) => {
        try {
          const [depsRaw, claimsRaw, exitsRaw] = await Promise.all([
            rhPublicClient.getLogs({
              address: pot,
              event: depositedEvent,
              fromBlock,
              toBlock: latest,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: claimedEvent,
              fromBlock,
              toBlock: latest,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: earlyExitedEvent,
              fromBlock,
              toBlock: latest,
            }),
          ])
          const mine = (user?: string) =>
            (user ?? "").toLowerCase() === walletChecksum.toLowerCase()
          return {
            pot,
            deps: depsRaw.filter((l) => mine((l.args as { user?: string }).user)),
            claims: claimsRaw.filter((l) => mine((l.args as { user?: string }).user)),
            exits: exitsRaw.filter((l) => mine((l.args as { user?: string }).user)),
          }
        } catch {
          return { pot, deps: [], claims: [], exits: [] }
        }
      })
    )

    for (const { pot, deps, claims, exits } of results) {
      for (const log of deps) {
        rawActivity.push({
          kind: "deposit",
          pot,
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { amount?: bigint }).amount ?? 0n),
          xp: XP_REWARDS.deposit,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
      }
      for (const log of claims) {
        rawActivity.push({
          kind: "claim",
          pot,
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          xp: XP_REWARDS.claim,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
      }
      for (const log of exits) {
        rawActivity.push({
          kind: "early_exit",
          pot,
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { refund?: bigint }).refund ?? 0n),
          xp: XP_REWARDS.early_exit,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
      }
    }
  }

  if (marketplaceConfig.address !== "0x0000000000000000000000000000000000000000") {
    try {
      const [asSeller, asBuyer, listings, cancellations] = await Promise.all([
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: soldEvent,
          args: { seller: walletChecksum },
          fromBlock,
          toBlock: latest,
        }),
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: soldEvent,
          args: { buyer: walletChecksum },
          fromBlock,
          toBlock: latest,
        }),
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: listedEvent,
          args: { seller: walletChecksum },
          fromBlock,
          toBlock: latest,
        }),
        rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: listingCancelledEvent,
          args: { seller: walletChecksum },
          fromBlock,
          toBlock: latest,
        }),
      ])
      for (const log of asSeller) {
        const buyer = (log.args as { buyer?: string }).buyer?.toLowerCase()
        if (buyer === wallet.toLowerCase()) continue
        rawActivity.push({
          kind: "sell",
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { price?: bigint }).price ?? 0n),
          xp: XP_REWARDS.sell,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
      }
      for (const log of asBuyer) {
        const seller = (log.args as { seller?: string }).seller?.toLowerCase()
        if (seller === wallet.toLowerCase()) continue
        rawActivity.push({
          kind: "buy",
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { price?: bigint }).price ?? 0n),
          xp: XP_REWARDS.buy,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
      }
      for (const log of listings) {
        rawActivity.push({
          kind: "list",
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          amount: String((log.args as { price?: bigint }).price ?? 0n),
          xp: 0,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
      }
      for (const log of cancellations) {
        rawActivity.push({
          kind: "delist",
          tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
          xp: 0,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
      }
    } catch {
      /* keep going */
    }
  }

  // Mint fallback: Transfer(0x0 → wallet) counts as deposit XP when Deposited was missed.
  if (potCardConfig.address !== "0x0000000000000000000000000000000000000000") {
    try {
      const mints = await rhPublicClient.getLogs({
        address: potCardConfig.address,
        event: transferEvent,
        args: {
          from: "0x0000000000000000000000000000000000000000",
          to: walletChecksum,
        },
        fromBlock,
        toBlock: latest,
      })
      const depositedTokenIds = new Set(
        rawActivity.filter((a) => a.kind === "deposit" && a.tokenId).map((a) => a.tokenId!)
      )
      for (const log of mints) {
        const tokenId = String((log.args as { tokenId?: bigint }).tokenId ?? "")
        if (!tokenId || depositedTokenIds.has(tokenId)) continue
        rawActivity.push({
          kind: "deposit",
          tokenId,
          xp: XP_REWARDS.deposit,
          blockNumber: log.blockNumber,
        })
        pendingBlocks.push(log.blockNumber)
        depositedTokenIds.add(tokenId)
      }
    } catch {
      /* keep going */
    }
  }

  // Reveal XP: owner at reveal block (deterministic — not current owner).
  if (potCardConfig.address !== "0x0000000000000000000000000000000000000000") {
    try {
      const reveals = await rhPublicClient.getLogs({
        address: potCardConfig.address,
        event: cardRevealedEvent,
        fromBlock,
        toBlock: latest,
      })
      const REVEAL_CONCURRENCY = 8
      for (let i = 0; i < reveals.length; i += REVEAL_CONCURRENCY) {
        const slice = reveals.slice(i, i + REVEAL_CONCURRENCY)
        await Promise.all(
          slice.map(async (log) => {
            const tokenId = (log.args as { tokenId?: bigint }).tokenId
            if (tokenId == null) return
            try {
              const owner = (await rhPublicClient.readContract({
                ...potCardConfig,
                functionName: "ownerOf",
                args: [tokenId],
                blockNumber: log.blockNumber,
              })) as string
              if (owner.toLowerCase() !== wallet.toLowerCase()) return
              rawActivity.push({
                kind: "reveal",
                tokenId: String(tokenId),
                xp: XP_REWARDS.reveal,
                blockNumber: log.blockNumber,
              })
              pendingBlocks.push(log.blockNumber)
            } catch {
              /* burned / unavailable at block */
            }
          })
        )
      }
    } catch {
      /* keep going */
    }
  }

  const times = await blockTimes(pendingBlocks, latest, latestTs)
  const activity: ProfileActivityItem[] = rawActivity.map((row) => ({
    kind: row.kind,
    at: atFor(times, row.blockNumber, latest, latestTs),
    pot: row.pot,
    tokenId: row.tokenId,
    amount: row.amount,
    xp: row.xp,
    blockNumber: row.blockNumber.toString(),
  }))

  activity.sort((a, b) => b.at - a.at)

  const xpEvents: XpEvent[] = activity
    .filter((a) => a.xp > 0)
    .map((a) => ({
      kind: a.kind as XpEvent["kind"],
      wallet: wallet.toLowerCase(),
      at: a.at,
      pot: a.pot,
      tokenId: a.tokenId,
      xp: a.xp,
    }))

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

  return { activity, xpEvents, createdPots, timeline }
}
