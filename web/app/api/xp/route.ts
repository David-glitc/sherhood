import { NextResponse } from "next/server"
import { parseAbiItem } from "viem"
import { potFactoryConfig, marketplaceConfig, potCardConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { XP_REWARDS, scoreWallets, type XpEvent } from "@/lib/xp"
import { XP_INDEX_FROM_BLOCK } from "@/lib/xp-from-block"
import { getCachedLeaderboard, saveLeaderboard } from "@/lib/xp-store"
import { isProtocolOpsWallet } from "@/lib/protocol-ops"

export const dynamic = "force-dynamic"

const deposited = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 entryFeePaid, uint256 indexed tokenId)"
)
const claimed = parseAbiItem(
  "event Claimed(address indexed user, uint256 indexed tokenId, address[] tokens, uint256[] payouts)"
)
const earlyExited = parseAbiItem(
  "event EarlyExited(address indexed user, uint256 indexed tokenId, uint256 depositAmount, uint256 fee, uint256 refund)"
)
const potCreated = parseAbiItem(
  "event PotCreated(address indexed pot, address indexed creator, uint256 fundingGoal, uint256 deadline, uint256 minDeposit, uint256 entryFee, uint256 protocolFeeBps, bool community)"
)
const sold = parseAbiItem(
  "event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royalty)"
)
const cardRevealed = parseAbiItem(
  "event CardRevealed(uint256 indexed tokenId, uint256 ownershipWeight, uint8 rarity)"
)

/** RH ~2s blocks. Never drop events — estimate when getBlock fails. */
async function blockTimes(
  blockNumbers: bigint[],
  latest: bigint,
  latestTs: number
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(blockNumbers.map((b) => b.toString())))
  const map = new Map<string, number>()
  const AVG_BLOCK_SEC = 2

  const estimate = (bn: bigint) =>
    Math.max(0, latestTs - Number(latest - bn) * AVG_BLOCK_SEC)

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

export async function GET() {
  const cached = await getCachedLeaderboard(50)
  if (cached && cached.leaderboard.length > 0) {
    const publicLeaderboard = cached.leaderboard.filter(
      (row) => row.xp > 0 && !isProtocolOpsWallet(row.wallet)
    )
    return NextResponse.json(
      { ...cached, leaderboard: publicLeaderboard, source: "db" },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    )
  }

  try {
    const events: XpEvent[] = []
    const latestBlock = await rhPublicClient.getBlock()
    const latest = latestBlock.number
    const latestTs = Number(latestBlock.timestamp)
    const fromBlock = XP_INDEX_FROM_BLOCK
    const pendingBlocks: bigint[] = []

    type Raw = {
      kind: XpEvent["kind"]
      wallet: string
      blockNumber: bigint
      pot?: string
      tokenId?: string
      xp: number
    }
    const raw: Raw[] = []

    if (potFactoryConfig.address !== "0x0000000000000000000000000000000000000000") {
      try {
        const created = await rhPublicClient.getLogs({
          address: potFactoryConfig.address,
          event: potCreated,
          fromBlock,
          toBlock: latest,
        })
        for (const log of created) {
          const creator = (log.args as { creator?: string }).creator
          if (!creator) continue
          raw.push({
            kind: "create",
            wallet: creator,
            blockNumber: log.blockNumber,
            pot: (log.args as { pot?: string }).pot,
            xp: XP_REWARDS.create,
          })
          pendingBlocks.push(log.blockNumber)
        }
      } catch {
        /* continue */
      }

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

      // Index every pot (small set today). Cap concurrency to protect RPC.
      const CONCURRENCY = 8
      for (let i = 0; i < pots.length; i += CONCURRENCY) {
        const batch = pots.slice(i, i + CONCURRENCY)
        const potBatches = await Promise.all(
          batch.map(async (pot) => {
            try {
              const [deps, claims, exits] = await Promise.all([
                rhPublicClient.getLogs({
                  address: pot,
                  event: deposited,
                  fromBlock,
                  toBlock: latest,
                }),
                rhPublicClient.getLogs({
                  address: pot,
                  event: claimed,
                  fromBlock,
                  toBlock: latest,
                }),
                rhPublicClient.getLogs({
                  address: pot,
                  event: earlyExited,
                  fromBlock,
                  toBlock: latest,
                }),
              ])
              return { pot, deps, claims, exits }
            } catch {
              return { pot, deps: [], claims: [], exits: [] }
            }
          })
        )

        for (const { pot, deps, claims, exits } of potBatches) {
          for (const log of deps) {
            const user = (log.args as { user?: string }).user
            if (!user) continue
            raw.push({
              kind: "deposit",
              wallet: user,
              blockNumber: log.blockNumber,
              pot,
              tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
              xp: XP_REWARDS.deposit,
            })
            pendingBlocks.push(log.blockNumber)
          }
          for (const log of claims) {
            const user = (log.args as { user?: string }).user
            if (!user) continue
            raw.push({
              kind: "claim",
              wallet: user,
              blockNumber: log.blockNumber,
              pot,
              xp: XP_REWARDS.claim,
            })
            pendingBlocks.push(log.blockNumber)
          }
          for (const log of exits) {
            const user = (log.args as { user?: string }).user
            if (!user) continue
            raw.push({
              kind: "early_exit",
              wallet: user,
              blockNumber: log.blockNumber,
              pot,
              xp: XP_REWARDS.early_exit,
            })
            pendingBlocks.push(log.blockNumber)
          }
        }
      }
    }

    // Reveal XP: CardRevealed → current owner (still holds or just revealed)
    if (potCardConfig.address !== "0x0000000000000000000000000000000000000000") {
      try {
        const reveals = await rhPublicClient.getLogs({
          address: potCardConfig.address,
          event: cardRevealed,
          fromBlock,
          toBlock: latest,
        })
        const CONCURRENCY = 10
        for (let i = 0; i < reveals.length; i += CONCURRENCY) {
          const slice = reveals.slice(i, i + CONCURRENCY)
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
                raw.push({
                  kind: "reveal",
                  wallet: owner,
                  blockNumber: log.blockNumber,
                  tokenId: String(tokenId),
                  xp: XP_REWARDS.reveal,
                })
                pendingBlocks.push(log.blockNumber)
              } catch {
                // claimed/burned — skip (claim XP already covers that path)
              }
            })
          )
        }
      } catch {
        /* continue */
      }
    }

    if (marketplaceConfig.address !== "0x0000000000000000000000000000000000000000") {
      try {
        const sales = await rhPublicClient.getLogs({
          address: marketplaceConfig.address,
          event: sold,
          fromBlock,
          toBlock: latest,
        })
        for (const log of sales) {
          const args = log.args as { seller?: string; buyer?: string; tokenId?: bigint }
          const seller = args.seller?.toLowerCase()
          const buyer = args.buyer?.toLowerCase()
          // Self-trades: no XP (prevents wash farming)
          if (seller && buyer && seller === buyer) continue
          if (args.seller) {
            raw.push({
              kind: "sell",
              wallet: args.seller,
              blockNumber: log.blockNumber,
              tokenId: String(args.tokenId ?? ""),
              xp: XP_REWARDS.sell,
            })
            pendingBlocks.push(log.blockNumber)
          }
          if (args.buyer) {
            raw.push({
              kind: "buy",
              wallet: args.buyer,
              blockNumber: log.blockNumber,
              tokenId: String(args.tokenId ?? ""),
              xp: XP_REWARDS.buy,
            })
            pendingBlocks.push(log.blockNumber)
          }
        }
      } catch {
        /* continue */
      }
    }

    const times = await blockTimes(pendingBlocks, latest, latestTs)
    for (const row of raw) {
      const key = row.blockNumber.toString()
      const at =
        times.get(key) ??
        Math.max(0, latestTs - Number(latest - row.blockNumber) * 2)
      events.push({
        kind: row.kind,
        wallet: row.wallet,
        at,
        pot: row.pot,
        tokenId: row.tokenId,
        xp: row.xp,
      })
    }

    const leaderboard = scoreWallets(events).filter(
      (row) => row.xp > 0 && !isProtocolOpsWallet(row.wallet)
    )
    await saveLeaderboard(leaderboard, events)
    // Always return the full DB board after upsert — never a partial chain-only slice
    // (partial responses caused different browsers to see different leaderboards).
    const full = await getCachedLeaderboard(50, { allowStale: true })
    const board = (full?.leaderboard?.length ? full.leaderboard : leaderboard.slice(0, 50)).filter(
      (row) => row.xp > 0 && !isProtocolOpsWallet(row.wallet)
    )
    return NextResponse.json(
      {
        leaderboard: board,
        events: events.length,
        updatedAt: Date.now(),
        source: "chain",
      },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
    )
  } catch (e) {
    const stale = await getCachedLeaderboard(50, { allowStale: true })
    if (stale && stale.leaderboard.length > 0) {
      return NextResponse.json(
        {
          ...stale,
          leaderboard: stale.leaderboard.filter(
            (row) => row.xp > 0 && !isProtocolOpsWallet(row.wallet)
          ),
          source: "stale",
          warning: e instanceof Error ? e.message : "xp unavailable",
        },
        { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
      )
    }
    return NextResponse.json(
      {
        leaderboard: [],
        events: 0,
        error: e instanceof Error ? e.message : "xp unavailable",
        updatedAt: Date.now(),
      },
      { status: 200 }
    )
  }
}
