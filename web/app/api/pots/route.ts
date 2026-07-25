import { NextResponse } from "next/server"
import { potAbi, potFactoryConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { POT_STATUSES, fmtUsdg } from "@/hooks/use-pots"
import { basketName } from "@/lib/basket-name"
import { allVisiblePots } from "@/lib/hidden-pots"
import { sortPoolsByActivity } from "@/lib/pool-rank"

// On-chain reads must run at request time — prerendering bakes stale chain state.
// CDN caching is handled by the Cache-Control response header (s-maxage=30).
export const dynamic = "force-dynamic"

export async function GET() {
  const factory = potFactoryConfig.address
  if (factory === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ pots: [] })
  }

  try {
    const addresses = allVisiblePots(
      (await rhPublicClient.readContract({
        address: factory,
        abi: potFactoryConfig.abi,
        functionName: "getPots",
        args: [],
      })) as `0x${string}`[]
    )

    const pots = await Promise.all(
      addresses.map(async (address) => {
        const [fundingGoal, deadline, minDeposit, status, totalDeposited, participantCount, progressBps] =
          await rhPublicClient.multicall({
            contracts: [
              { address, abi: potAbi, functionName: "fundingGoal" },
              { address, abi: potAbi, functionName: "deadline" },
              { address, abi: potAbi, functionName: "minDeposit" },
              { address, abi: potAbi, functionName: "status" },
              { address, abi: potAbi, functionName: "totalDeposited" },
              { address, abi: potAbi, functionName: "participantCount" },
              { address, abi: potAbi, functionName: "fundingProgressBps" },
            ],
          })

        const read = (i: number) => {
          const r = [
            fundingGoal,
            deadline,
            minDeposit,
            status,
            totalDeposited,
            participantCount,
            progressBps,
          ][i]
          if (r.status !== "success") throw new Error("read failed")
          return r.result as bigint
        }

        const statusNum = Number(read(3))
        return {
          address,
          name: basketName(address),
          fundingGoal: read(0).toString(),
          deadline: read(1).toString(),
          minDeposit: read(2).toString(),
          status: statusNum,
          statusLabel: POT_STATUSES[statusNum] ?? "Unknown",
          totalDeposited: read(4).toString(),
          participantCount: read(5).toString(),
          progressBps: read(6).toString(),
          progressPct: Math.min(100, Number(read(6)) / 100),
          fundingGoalFmt: fmtUsdg(read(0)),
          totalDepositedFmt: fmtUsdg(read(4)),
          minDepositFmt: fmtUsdg(read(2)),
          totalDepositedRaw: read(4),
          participantCountRaw: read(5),
          progressBpsRaw: read(6),
          deadlineRaw: read(1),
        }
      })
    )

    const ranked = sortPoolsByActivity(
      pots.map((p) => ({
        address: p.address,
        status: p.status,
        totalDeposited: p.totalDepositedRaw,
        participantCount: p.participantCountRaw,
        progressBps: p.progressBpsRaw,
        deadline: p.deadlineRaw,
      }))
    )
    const byAddr = new Map(pots.map((p) => [p.address.toLowerCase(), p]))
    const ordered = ranked
      .map((r) => {
        const p = byAddr.get(r.address.toLowerCase())
        if (!p) return null
        const {
          totalDepositedRaw: _a,
          participantCountRaw: _b,
          progressBpsRaw: _c,
          deadlineRaw: _d,
          ...rest
        } = p
        return rest
      })
      .filter((p): p is NonNullable<typeof p> => p != null)

    const open = ordered.filter((p) => p.status === 0)
    return NextResponse.json(
      { pots: ordered, open },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    )
  } catch {
    return NextResponse.json({ error: "pots unavailable", pots: [], open: [] }, { status: 502 })
  }
}
