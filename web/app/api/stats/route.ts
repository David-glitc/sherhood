import { NextResponse } from "next/server"
import { potAbi, potCardConfig, potFactoryConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { POT_STATUSES, fmtUsdg } from "@/hooks/use-pots"

export const revalidate = 30

type PoolBucket = "live" | "processing" | "ended" | "cancelled"

function bucket(status: number, deadline: bigint, now: number): PoolBucket {
  if (status === 0) {
    return Number(deadline) > now ? "live" : "processing" // expired Funding until close/cancel
  }
  if (status === 1 || status === 2) return "processing"
  if (status === 4) return "cancelled"
  return "ended"
}

export async function GET() {
  const factory = potFactoryConfig.address
  const card = potCardConfig.address
  if (factory === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "factory unset" }, { status: 503 })
  }

  try {
    const now = Math.floor(Date.now() / 1000)

    const [protocol, minted, burned, supply, addresses] = await Promise.all([
      rhPublicClient.readContract({
        address: factory,
        abi: potFactoryConfig.abi,
        functionName: "protocolStats",
        args: [],
      }) as Promise<readonly [bigint, bigint, bigint, bigint]>,
      card !== "0x0000000000000000000000000000000000000000"
        ? (rhPublicClient.readContract({
            address: card,
            abi: potCardConfig.abi,
            functionName: "totalMinted",
            args: [],
          }) as Promise<bigint>)
        : Promise.resolve(0n),
      card !== "0x0000000000000000000000000000000000000000"
        ? (rhPublicClient.readContract({
            address: card,
            abi: potCardConfig.abi,
            functionName: "totalBurned",
            args: [],
          }) as Promise<bigint>)
        : Promise.resolve(0n),
      card !== "0x0000000000000000000000000000000000000000"
        ? (rhPublicClient.readContract({
            address: card,
            abi: potCardConfig.abi,
            functionName: "totalSupply",
            args: [],
          }) as Promise<bigint>)
        : Promise.resolve(0n),
      rhPublicClient.readContract({
        address: factory,
        abi: potFactoryConfig.abi,
        functionName: "getPots",
        args: [],
      }) as Promise<`0x${string}`[]>,
    ])

    const [pools, depositVolume, deposits, users] = protocol

    let live = 0
    let processing = 0
    let ended = 0
    let cancelled = 0
    let fundingTvl = 0n

    await Promise.all(
      addresses.map(async (address) => {
        const [statusR, depositedR, deadlineR] = await Promise.all([
          rhPublicClient.readContract({ address, abi: potAbi, functionName: "status" }),
          rhPublicClient.readContract({ address, abi: potAbi, functionName: "totalDeposited" }),
          rhPublicClient.readContract({ address, abi: potAbi, functionName: "deadline" }),
        ])
        const status = Number(statusR as bigint)
        const deposited = depositedR as bigint
        const deadline = deadlineR as bigint
        const b = bucket(status, deadline, now)
        if (b === "live") {
          live += 1
          fundingTvl += deposited
        } else if (b === "processing") processing += 1
        else if (b === "cancelled") cancelled += 1
        else ended += 1
      })
    )

    return NextResponse.json(
      {
        pools: {
          total: Number(pools),
          live,
          processing,
          ended,
          cancelled,
        },
        cards: {
          minted: minted.toString(),
          burned: burned.toString(),
          active: supply.toString(),
        },
        users: {
          uniqueDepositors: users.toString(),
          deposits: deposits.toString(),
        },
        volume: {
          totalDepositedUsdg: depositVolume.toString(),
          totalDepositedFmt: fmtUsdg(depositVolume),
          fundingTvlUsdg: fundingTvl.toString(),
          fundingTvlFmt: fmtUsdg(fundingTvl),
        },
        note:
          "fundingTvl = USDG still in Funding pots. Stock NAV after purchase needs off-chain prices. Protocol fees = TreasuryDirect.feesForwardedUSDG.",
        statusLabels: POT_STATUSES,
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stats unavailable" },
      { status: 502 }
    )
  }
}
