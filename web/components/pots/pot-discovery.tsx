"use client"

import { useMemo } from "react"
import { useReadContract, useReadContracts } from "wagmi"
import { motion, useReducedMotion } from "framer-motion"
import { potFactoryConfig, potAbi } from "@/lib/contracts"
import { allVisiblePots } from "@/lib/hidden-pots"
import { usePoolNamesHydration } from "@/hooks/use-pool-names"
import {
  POT_STATUSES,
  deadlineLabel,
  fmtUsdg,
  isAcceptingDeposits,
  parseHoldings,
  type PotView,
} from "@/hooks/use-pots"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { basketName } from "@/lib/basket-name"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { StockPriceChart } from "@/components/stocks/stock-price-chart"
import { ShrhLuckPill } from "@/components/layout/shrh-luck-pill"
import { BuyShrhButton } from "@/components/tokens/buy-shrh-dialog"
import { poolActivityScore } from "@/lib/pool-rank"
import Link from "next/link"
import { cn } from "@/lib/utils"

function usePotAddresses() {
  const { data, isLoading } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
    query: { refetchInterval: 20_000 },
  })
  const pots = allVisiblePots((data as `0x${string}`[] | undefined) ?? [])
  return { pots, isLoading }
}

/** Rank factory pots by volume / activity before rendering. */
function useRankedPotAddresses(pots: `0x${string}`[]) {
  const contracts = useMemo(
    () =>
      pots.flatMap((address) => [
        { address, abi: potAbi, functionName: "status" as const },
        { address, abi: potAbi, functionName: "totalDeposited" as const },
        { address, abi: potAbi, functionName: "participantCount" as const },
        { address, abi: potAbi, functionName: "fundingProgressBps" as const },
        { address, abi: potAbi, functionName: "deadline" as const },
      ]),
    [pots]
  )

  const { data } = useReadContracts({
    contracts,
    query: { enabled: pots.length > 0, refetchInterval: 12_000 },
  })

  return useMemo(() => {
    if (!data || data.length < pots.length * 5) return pots
    const rows = pots.map((address, i) => {
      const base = i * 5
      const status = data[base]?.status === "success" ? Number(data[base].result) : 4
      const totalDeposited =
        data[base + 1]?.status === "success" ? (data[base + 1].result as bigint) : 0n
      const participantCount =
        data[base + 2]?.status === "success" ? (data[base + 2].result as bigint) : 0n
      const progressBps =
        data[base + 3]?.status === "success" ? (data[base + 3].result as bigint) : 0n
      const deadline =
        data[base + 4]?.status === "success" ? (data[base + 4].result as bigint) : 0n
      return {
        address,
        score: poolActivityScore({
          status,
          totalDeposited,
          participantCount,
          progressBps,
          deadline,
        }),
      }
    })
    return rows.sort((a, b) => b.score - a.score || a.address.localeCompare(b.address)).map((r) => r.address)
  }, [pots, data])
}

function usePotView(address: `0x${string}`): PotView | null {
  const { data } = useReadContracts({
    contracts: [
      { address, abi: potAbi, functionName: "fundingGoal" },
      { address, abi: potAbi, functionName: "deadline" },
      { address, abi: potAbi, functionName: "minDeposit" },
      { address, abi: potAbi, functionName: "entryFee" },
      { address, abi: potAbi, functionName: "status" },
      { address, abi: potAbi, functionName: "totalDeposited" },
      { address, abi: potAbi, functionName: "participantCount" },
      { address, abi: potAbi, functionName: "fundingProgressBps" },
      { address, abi: potAbi, functionName: "getHoldings" },
    ],
    query: { refetchInterval: 12_000 },
  })

  return useMemo(() => {
    if (!data || data.some((r) => r.status !== "success")) return null
    const holdingsRaw = data[8].result as [string[], bigint[]] | undefined
    const holdings = parseHoldings(
      holdingsRaw?.[0] as `0x${string}`[] | undefined,
      holdingsRaw?.[1]
    )
    return {
      address,
      fundingGoal: data[0].result as bigint,
      deadline: data[1].result as bigint,
      minDeposit: data[2].result as bigint,
      entryFee: data[3].result as bigint,
      status: Number(data[4].result),
      totalDeposited: data[5].result as bigint,
      participantCount: data[6].result as bigint,
      progressBps: data[7].result as bigint,
      holdings,
    }
  }, [address, data])
}

function PotCardUi({
  address,
  index = 0,
}: {
  address: `0x${string}`
  index?: number
}) {
  const pot = usePotView(address)
  const reduceMotion = useReducedMotion()

  if (!pot) {
    return (
      <div className="h-80 animate-pulse rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent" />
    )
  }

  const status = POT_STATUSES[pot.status] ?? "Unknown"
  const isFunding = pot.status === 0
  const acceptingDeposits = isAcceptingDeposits(
    pot.status,
    pot.deadline,
    pot.totalDeposited,
    pot.fundingGoal
  )
  const isRevealed = pot.status === 3
  const progress = Math.min(100, Number(pot.progressBps) / 100)

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index, 8) * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070707] p-5 sm:p-6",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-[border-color,box-shadow] duration-300",
        "hover:border-[#ccff00]/30 hover:shadow-[0_20px_50px_-28px_rgba(204,255,0,0.35)]"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-16 size-40 rounded-full blur-3xl transition-opacity duration-500",
          isFunding
            ? "bg-[#ccff00]/18 opacity-80 group-hover:opacity-100"
            : "bg-amber-400/10 opacity-60"
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-[20px] font-bold tracking-tight text-white">
          <Link href={`/pools/${address}`} className="transition hover:text-[#ccff00]">
            {basketName(address)}
          </Link>
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
            isFunding && "bg-[#ccff00]/12 text-[#ccff00]",
            isRevealed && "bg-amber-400/15 text-amber-200",
            !isFunding && !isRevealed && "bg-white/5 text-white/45"
          )}
        >
          {status}
        </span>
      </div>

      {/* Chart-first surface */}
      <div className="relative mt-4 grid grid-cols-2 gap-2">
        {(pot.holdings.length > 0
          ? pot.holdings.map((h) => h.symbol)
          : BASKET_STOCKS.slice(0, 4).map((s) => s.symbol)
        )
          .slice(0, 4)
          .map((sym) => (
            <div
              key={sym}
              className="rounded-xl border border-white/[0.06] bg-black/40 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-white/45">{sym}</span>
                <StockLogoStack symbols={[sym]} size={16} max={1} />
              </div>
              <StockPriceChart symbol={sym} height={36} showPrice className="mt-1 max-w-none" />
            </div>
          ))}
      </div>

      <div className="relative mt-4">
        <div className="mb-2 flex items-end justify-between gap-2 text-[11px] text-white/35">
          <span className="inline-flex items-center gap-1.5 tabular-nums text-white/70">
            <span className="font-semibold text-white">${fmtUsdg(pot.totalDeposited)}</span>
            <span className="text-white/25">/</span>
            ${fmtUsdg(pot.fundingGoal)}
          </span>
          <span className="tabular-nums">{progress.toFixed(0)}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
          role="progressbar"
          aria-label="Pool funding progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#a8e600] to-[#ccff00]"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          />
        </div>
        <p className="mt-2 text-[11px] tabular-nums text-white/35">
          {Number(pot.participantCount)} · {deadlineLabel(pot.deadline)}
        </p>
      </div>

      {acceptingDeposits ? (
        <Link
          href={`/pools/${pot.address}`}
          className="relative mt-4 flex h-11 items-center justify-center rounded-xl bg-[#ccff00] text-sm font-semibold text-black transition hover:brightness-110"
        >
          View pool
        </Link>
      ) : null}

      {isFunding && !acceptingDeposits ? (
        <Link
          href={`/pools/${pot.address}`}
          className="relative mt-4 flex h-11 items-center justify-center rounded-xl bg-[#ccff00] text-sm font-semibold text-black transition hover:brightness-110"
        >
          End pool
        </Link>
      ) : null}

      {!acceptingDeposits && pot.status >= 2 ? (
        <Link
          href={`/pools/${address}?tab=claim`}
          className="relative mt-4 flex h-11 items-center justify-center rounded-xl border border-[#ccff00]/35 text-sm font-semibold text-[#ccff00] transition hover:bg-[#ccff00]/10"
        >
          Open vault
        </Link>
      ) : null}
    </motion.article>
  )
}

const DEMO_BASKETS = [
  { symbols: ["NVDA", "AAPL", "MSFT"], progress: 72, people: 18, goal: "100,000" },
  { symbols: ["SPY", "QQQ", "GOOGL"], progress: 41, people: 9, goal: "50,000" },
  { symbols: ["TSLA", "META", "AMD", "COIN"], progress: 88, people: 34, goal: "200,000" },
]

export function PotDiscovery() {
  usePoolNamesHydration()
  const { pots: rawPots, isLoading } = usePotAddresses()
  const pots = useRankedPotAddresses(rawPots)
  const zeroFactory =
    potFactoryConfig.address === "0x0000000000000000000000000000000000000000"

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <BuyShrhButton />
        <ShrhLuckPill />
      </div>

      {zeroFactory && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/[0.04] px-5 py-4 text-center text-sm text-[#ccff00]/90">
            Contracts not live on this build yet — preview below.
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_BASKETS.map((b) => (
              <div
                key={b.symbols.join("-")}
                className="rounded-2xl border border-white/[0.08] bg-[#070707] p-6"
              >
                <StockLogoStack symbols={b.symbols} size={32} max={4} className="mb-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Preview · multi-stock
                </p>
                <h3 className="mt-3 text-[22px] font-bold tracking-tight">
                  {b.symbols.slice(0, 2).join(" + ")}
                  {b.symbols.length > 2 ? ` +${b.symbols.length - 2}` : ""}
                </h3>
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-[11px] text-white/35">
                    <span>Goal {b.goal} USDG</span>
                    <span>{b.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#ccff00]"
                      style={{ width: `${b.progress}%` }}
                    />
                  </div>
                </div>
                <p className="mt-5 text-center text-xs text-white/30">{b.people} funded</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && pots.length === 0 && !zeroFactory && (
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#070707] p-12 text-center">
          <h2 className="text-xl font-semibold text-white/80">No Sherd pools available</h2>
          <p className="mt-2 text-sm text-white/40">
            New and revealed pools appear here from on-chain data.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/create?tab=instant" className="text-sm font-semibold text-[#ccff00]">
              Mint Instant Sherd →
            </Link>
            <Link href="/create?tab=pool" className="text-sm font-semibold text-white/50 hover:text-[#ccff00]">
              Create pool →
            </Link>
          </div>
        </div>
      )}

      {isLoading && !zeroFactory && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pots.map((addr, i) => (
          <PotCardUi key={addr} address={addr} index={i} />
        ))}
      </div>
    </div>
  )
}
