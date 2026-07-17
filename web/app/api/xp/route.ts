import { NextResponse } from "next/server"
import { createPublicClient, http, parseAbiItem } from "viem"
import { potFactoryConfig, marketplaceConfig } from "@/lib/contracts"
import { XP_REWARDS, scoreWallets, type XpEvent } from "@/lib/xp"

export const dynamic = "force-dynamic"
export const revalidate = 60

const chain = {
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
}

const client = createPublicClient({
  chain,
  transport: http(chain.rpcUrls.default.http[0]),
})

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

export async function GET() {
  try {
    const events: XpEvent[] = []
    const latest = await client.getBlockNumber()
    // Index a practical recent window — full history can move to a dedicated indexer later.
    const fromBlock = latest > 80_000n ? latest - 80_000n : 0n

    if (potFactoryConfig.address !== "0x0000000000000000000000000000000000000000") {
      const created = await client.getLogs({
        address: potFactoryConfig.address,
        event: potCreated,
        fromBlock,
        toBlock: latest,
      })
      for (const log of created) {
        const creator = (log.args as { creator?: string }).creator
        if (!creator) continue
        const block = await client.getBlock({ blockNumber: log.blockNumber })
        events.push({
          kind: "create",
          wallet: creator,
          at: Number(block.timestamp),
          pot: (log.args as { pot?: string }).pot,
          xp: XP_REWARDS.create,
        })
      }

      const pots = (await client.readContract({
        ...potFactoryConfig,
        functionName: "getPots",
        args: [],
      })) as `0x${string}`[]

      // Cap pot fan-out for latency.
      const sample = pots.slice(-40)
      for (const pot of sample) {
        const [deps, claims, exits] = await Promise.all([
          client.getLogs({ address: pot, event: deposited, fromBlock, toBlock: latest }),
          client.getLogs({ address: pot, event: claimed, fromBlock, toBlock: latest }),
          client.getLogs({ address: pot, event: earlyExited, fromBlock, toBlock: latest }),
        ])
        for (const log of deps) {
          const user = (log.args as { user?: string }).user
          if (!user) continue
          const block = await client.getBlock({ blockNumber: log.blockNumber })
          events.push({
            kind: "deposit",
            wallet: user,
            at: Number(block.timestamp),
            pot,
            tokenId: String((log.args as { tokenId?: bigint }).tokenId ?? ""),
            xp: XP_REWARDS.deposit,
          })
        }
        for (const log of claims) {
          const user = (log.args as { user?: string }).user
          if (!user) continue
          const block = await client.getBlock({ blockNumber: log.blockNumber })
          events.push({
            kind: "claim",
            wallet: user,
            at: Number(block.timestamp),
            pot,
            xp: XP_REWARDS.claim,
          })
        }
        for (const log of exits) {
          const user = (log.args as { user?: string }).user
          if (!user) continue
          const block = await client.getBlock({ blockNumber: log.blockNumber })
          events.push({
            kind: "early_exit",
            wallet: user,
            at: Number(block.timestamp),
            pot,
            xp: XP_REWARDS.early_exit,
          })
        }
      }
    }

    if (marketplaceConfig.address !== "0x0000000000000000000000000000000000000000") {
      const sales = await client.getLogs({
        address: marketplaceConfig.address,
        event: sold,
        fromBlock,
        toBlock: latest,
      })
      for (const log of sales) {
        const args = log.args as { seller?: string; buyer?: string; tokenId?: bigint }
        const block = await client.getBlock({ blockNumber: log.blockNumber })
        if (args.seller) {
          events.push({
            kind: "sell",
            wallet: args.seller,
            at: Number(block.timestamp),
            tokenId: String(args.tokenId ?? ""),
            xp: XP_REWARDS.sell,
          })
        }
        if (args.buyer) {
          events.push({
            kind: "buy",
            wallet: args.buyer,
            at: Number(block.timestamp),
            tokenId: String(args.tokenId ?? ""),
            xp: XP_REWARDS.buy,
          })
        }
      }
    }

    const leaderboard = scoreWallets(events).slice(0, 50)
    return NextResponse.json(
      { leaderboard, events: events.length, updatedAt: Date.now() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    )
  } catch (e) {
    return NextResponse.json(
      { leaderboard: [], events: 0, error: e instanceof Error ? e.message : "xp unavailable" },
      { status: 200 }
    )
  }
}
