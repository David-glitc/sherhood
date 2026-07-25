import { NextRequest, NextResponse } from "next/server"
import { parseAbiItem } from "viem"
import { marketplaceConfig, potCardConfig, potFactoryConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { fmtUsdg } from "@/hooks/use-pots"
import { basketName } from "@/lib/basket-name"

export const dynamic = "force-dynamic"

const depositedEvent = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 entryFeePaid, uint256 indexed tokenId)"
)
const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
)
const listedEvent = parseAbiItem(
  "event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)"
)
const cancelledEvent = parseAbiItem(
  "event Cancelled(uint256 indexed tokenId, address indexed seller)"
)
const soldEvent = parseAbiItem(
  "event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royalty)"
)

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

type ActivityRow = {
  kind: "mint" | "transfer" | "listed" | "sold" | "cancelled"
  atBlock: string
  text: string
  from?: string
  to?: string
  priceFmt?: string
}

/** Per-Sherd activity: mint/deposit, transfers, market list/sale/cancel. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "invalid tokenId", items: [] }, { status: 400 })
  }
  const tokenId = BigInt(id)
  const card = potCardConfig.address
  const market = marketplaceConfig.address
  const factory = potFactoryConfig.address

  if (card === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ items: [] })
  }

  try {
    const head = await rhPublicClient.getBlockNumber()
    const fromBlock = head > 800_000n ? head - 800_000n : 0n
    const items: ActivityRow[] = []

    const transfers = await rhPublicClient.getLogs({
      address: card,
      event: transferEvent,
      args: { tokenId },
      fromBlock,
      toBlock: "latest",
    })

    for (const log of transfers) {
      const from = (log.args.from as string) || "0x0"
      const to = (log.args.to as string) || "0x0"
      const zero = "0x0000000000000000000000000000000000000000"
      if (from.toLowerCase() === zero) {
        items.push({
          kind: "mint",
          atBlock: String(log.blockNumber ?? 0n),
          text: `Minted to ${short(to)}`,
          to,
        })
      } else if (to.toLowerCase() === zero) {
        items.push({
          kind: "transfer",
          atBlock: String(log.blockNumber ?? 0n),
          text: `Burned / claimed from ${short(from)}`,
          from,
          to,
        })
      } else {
        items.push({
          kind: "transfer",
          atBlock: String(log.blockNumber ?? 0n),
          text: `Transferred ${short(from)} → ${short(to)}`,
          from,
          to,
        })
      }
    }

    if (market !== "0x0000000000000000000000000000000000000000") {
      const [listed, cancelled, sold] = await Promise.all([
        rhPublicClient.getLogs({
          address: market,
          event: listedEvent,
          args: { tokenId },
          fromBlock,
          toBlock: "latest",
        }),
        rhPublicClient.getLogs({
          address: market,
          event: cancelledEvent,
          args: { tokenId },
          fromBlock,
          toBlock: "latest",
        }),
        rhPublicClient.getLogs({
          address: market,
          event: soldEvent,
          args: { tokenId },
          fromBlock,
          toBlock: "latest",
        }),
      ])

      for (const log of listed) {
        const seller = log.args.seller as string
        const price = log.args.price as bigint
        items.push({
          kind: "listed",
          atBlock: String(log.blockNumber ?? 0n),
          text: `Listed by ${short(seller)} for $${fmtUsdg(price)} USDG`,
          from: seller,
          priceFmt: fmtUsdg(price),
        })
      }
      for (const log of cancelled) {
        const seller = log.args.seller as string
        items.push({
          kind: "cancelled",
          atBlock: String(log.blockNumber ?? 0n),
          text: `Listing cancelled by ${short(seller)}`,
          from: seller,
        })
      }
      for (const log of sold) {
        const seller = log.args.seller as string
        const buyer = log.args.buyer as string
        const price = log.args.price as bigint
        items.push({
          kind: "sold",
          atBlock: String(log.blockNumber ?? 0n),
          text: `Sold ${short(seller)} → ${short(buyer)} for $${fmtUsdg(price)} USDG`,
          from: seller,
          to: buyer,
          priceFmt: fmtUsdg(price),
        })
      }
    }

    // Optional pool deposit context (best-effort)
    if (factory !== "0x0000000000000000000000000000000000000000") {
      try {
        const pots = (await rhPublicClient.readContract({
          address: factory,
          abi: potFactoryConfig.abi,
          functionName: "getPots",
          args: [],
        })) as `0x${string}`[]
        const depositLogs = (
          await Promise.all(
            pots.slice(-40).map((address) =>
              rhPublicClient.getLogs({
                address,
                event: depositedEvent,
                args: { tokenId },
                fromBlock,
                toBlock: "latest",
              })
            )
          )
        ).flat()
        for (const log of depositLogs) {
          const user = log.args.user as string
          const amount = log.args.amount as bigint
          items.push({
            kind: "mint",
            atBlock: String(log.blockNumber ?? 0n),
            text: `${short(user)} funded $${fmtUsdg(amount)} on ${basketName(log.address)}`,
            from: user,
            priceFmt: fmtUsdg(amount),
          })
        }
      } catch {
        /* ignore deposit enrichment */
      }
    }

    items.sort((a, b) => (BigInt(b.atBlock) > BigInt(a.atBlock) ? 1 : -1))

    return NextResponse.json(
      { items: items.slice(0, 40) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    )
  } catch {
    return NextResponse.json({ error: "activity unavailable", items: [] }, { status: 502 })
  }
}
