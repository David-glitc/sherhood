import { NextResponse } from "next/server"
import { parseAbiItem } from "viem"
import { potFactoryConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { fmtUsdg } from "@/hooks/use-pots"

export const revalidate = 45

const depositedEvent = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 entryFeePaid, uint256 indexed tokenId)"
)

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function basketLabel(pot: string): string {
  return `Basket ${truncAddr(pot)}`
}

export async function GET() {
  const factory = potFactoryConfig.address
  if (factory === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ items: [] })
  }

  try {
    const potAddresses = (await rhPublicClient.readContract({
      address: factory,
      abi: potFactoryConfig.abi,
      functionName: "getPots",
      args: [],
    })) as `0x${string}`[]

    if (potAddresses.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const head = await rhPublicClient.getBlockNumber()
    const fromBlock = head > 500_000n ? head - 500_000n : 0n

    const allLogs = (
      await Promise.all(
        potAddresses.map((address) =>
          rhPublicClient.getLogs({
            address,
            event: depositedEvent,
            fromBlock,
            toBlock: "latest",
          })
        )
      )
    ).flat()

    const countKey = (user: string, pot: string) => `${user.toLowerCase()}:${pot.toLowerCase()}`
    const counts = new Map<string, number>()
    for (const log of allLogs) {
      const user = log.args.user as string
      const pot = log.address
      const key = countKey(user, pot)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const items = allLogs
      .map((log) => {
        const user = log.args.user as string
        const pot = log.address
        const amount = log.args.amount as bigint
        const tokenId = log.args.tokenId as bigint
        const key = countKey(user, pot)
        const times = counts.get(key) ?? 1
        const blockNumber = log.blockNumber ?? 0n
        return {
          user,
          userShort: truncAddr(user),
          pot,
          potShort: truncAddr(pot),
          basketLabel: basketLabel(pot),
          amount: amount.toString(),
          amountFmt: fmtUsdg(amount),
          tokenId: tokenId.toString(),
          times,
          blockNumber: blockNumber.toString(),
          text:
            times > 1
              ? `${truncAddr(user)} funded ${times}× on ${basketLabel(pot)}`
              : `${truncAddr(user)} funded ${fmtUsdg(amount)} USDG on ${basketLabel(pot)}`,
        }
      })
      .sort((a, b) => (BigInt(b.blockNumber) > BigInt(a.blockNumber) ? 1 : -1))
      .slice(0, 40)

    const seen = new Set<string>()
    const deduped = items.filter((item) => {
      const k = countKey(item.user, item.pot)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    return NextResponse.json(
      { items: deduped.slice(0, 16) },
      { headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=90" } }
    )
  } catch {
    return NextResponse.json({ error: "activity unavailable", items: [] }, { status: 502 })
  }
}
