"use client"

import { useMemo, useState } from "react"
import { formatEther } from "viem"
import { useAccount, useReadContracts } from "wagmi"
import { ERC20_ABI } from "@/lib/contracts"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { SHRH_SYMBOL } from "@/lib/protocol"
import { useFundBalances } from "@/hooks/use-fund-balances"
import { useEthUsd } from "@/hooks/use-eth-usd"
import { useStockPrices } from "@/hooks/use-stock-prices"
import { useSherdQuote } from "@/hooks/use-sherd-quote"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function fmtUsd(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function fmtAmt(n: number | null, digits = 4) {
  if (n == null) return "…"
  if (n === 0) return "0"
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

type WalletBalancesCardProps = {
  sherdNavUsd: number
  sherdReady: boolean
  className?: string
}

const CASH_COLORS = {
  ETH: "#627eea",
  WETH: "#8b9cf7",
  USDG: "#ccff00",
  Sherds: "#a3e635",
  SHERD: "#bef264",
} as const

/** Live wallet cash + stock tokens + Sherd NAV. */
export function WalletBalancesCard({
  sherdNavUsd,
  sherdReady,
  className,
}: WalletBalancesCardProps) {
  const { address } = useAccount()
  const { eth, weth, usdg, sherd } = useFundBalances()
  const { ethUsd } = useEthUsd()
  const sherdQuote = useSherdQuote()
  const [showEmpty, setShowEmpty] = useState(false)
  const stockSymbols = useMemo(() => BASKET_STOCKS.map((s) => s.symbol), [])
  const { quotes } = useStockPrices(stockSymbols)

  const stockContracts = useMemo(
    () =>
      BASKET_STOCKS.map((s) => ({
        address: s.address,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: address ? ([address] as const) : undefined,
      })),
    [address]
  )

  const { data: stockBals } = useReadContracts({
    contracts: stockContracts,
    query: { enabled: !!address },
  })

  const ethPrice = ethUsd ?? 0
  const ethUsdVal = eth != null && ethPrice ? eth * ethPrice : 0
  const wethUsdVal = weth != null && ethPrice ? weth * ethPrice : 0
  const usdgUsdVal = usdg ?? 0
  const sherdTokenUsd =
    sherd != null && sherdQuote?.priceUsd ? sherd * sherdQuote.priceUsd : 0

  const allStockRows = useMemo(() => {
    return BASKET_STOCKS.map((s, i) => {
      const raw = stockBals?.[i]?.status === "success" ? (stockBals[i].result as bigint) : null
      const bal = raw != null ? Number(formatEther(raw)) : null
      const price = quotes[s.symbol]?.price ?? 0
      const value = bal != null && price > 0 ? bal * price : 0
      return {
        key: s.symbol,
        label: s.symbol,
        bal: fmtAmt(bal, 4),
        value,
        ready: bal != null,
        nonZero: bal != null && bal > 0,
        color: "#94a3b8",
      }
    })
  }, [stockBals, quotes])

  const stockRows = useMemo(
    () => allStockRows.filter((r) => (showEmpty ? r.ready : r.nonZero)),
    [allStockRows, showEmpty]
  )

  const cashUsd = ethUsdVal + wethUsdVal + usdgUsdVal + sherdTokenUsd
  const cashReady = eth != null && weth != null && usdg != null
  const totalUsd = cashUsd + (sherdReady ? sherdNavUsd : 0)
  const totalReady = cashReady && sherdReady

  const cashRows = useMemo(() => {
    return [
      {
        key: "ETH" as const,
        label: "ETH",
        bal: fmtAmt(eth, 5),
        value: ethUsdVal,
        ready: eth != null && Boolean(ethPrice),
        color: CASH_COLORS.ETH,
      },
      {
        key: "WETH" as const,
        label: "WETH",
        bal: fmtAmt(weth, 5),
        value: wethUsdVal,
        ready: weth != null && Boolean(ethPrice),
        color: CASH_COLORS.WETH,
      },
      {
        key: "USDG" as const,
        label: "USDG",
        bal: fmtAmt(usdg, 2),
        value: usdgUsdVal,
        ready: usdg != null,
        logo: true,
        color: CASH_COLORS.USDG,
      },
      {
        key: "SHERD" as const,
        label: `$${SHRH_SYMBOL}`,
        bal: fmtAmt(sherd, 2),
        value: sherdTokenUsd,
        ready: sherd != null,
        color: CASH_COLORS.SHERD,
        show: showEmpty || (sherd != null && sherd > 0),
      },
      {
        key: "Sherds" as const,
        label: "Sherds",
        bal: "NAV",
        value: sherdReady ? sherdNavUsd : 0,
        ready: sherdReady,
        color: CASH_COLORS.Sherds,
      },
    ].filter(
      (r) =>
        r.key === "ETH" ||
        r.key === "WETH" ||
        r.key === "USDG" ||
        r.key === "Sherds" ||
        ("show" in r && r.show)
    )
  }, [
    eth,
    weth,
    usdg,
    sherd,
    ethUsdVal,
    wethUsdVal,
    usdgUsdVal,
    sherdTokenUsd,
    ethPrice,
    sherdNavUsd,
    sherdReady,
    showEmpty,
  ])

  const barRows = [...cashRows, ...stockRows.filter((r) => r.nonZero)]
  const barTotal = Math.max(
    barRows.reduce((s, r) => s + (r.value > 0 ? r.value : 0), 0),
    0.0001
  )

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070707] p-5 sm:p-6",
        className
      )}
      aria-label="Portfolio"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#ccff00]/10 blur-3xl"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ccff00]/80">
            Balances
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Portfolio</h2>
          <p className="mt-1 text-sm text-white/45">Wallet + Sherd NAV</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
            Total value
          </p>
          {totalReady ? (
            <p className="mt-0.5 text-[clamp(1.5rem,4vw,2.25rem)] font-bold tabular-nums tracking-tight text-[#ccff00]">
              {fmtUsd(totalUsd)}
            </p>
          ) : (
            <Skeleton className="mt-1 ml-auto h-9 w-32 bg-white/10" />
          )}
        </div>
      </div>

      <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-white/[0.06]">
        {totalReady ? (
          <div className="flex h-full w-full">
            {barRows.map((r) => {
              if (r.value <= 0) return null
              const pct = (r.value / barTotal) * 100
              return (
                <div
                  key={r.key}
                  title={`${r.label} ${fmtUsd(r.value)}`}
                  className="h-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: r.color,
                    minWidth: pct > 0 ? 4 : 0,
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div className="h-full w-1/3 animate-pulse bg-white/10" />
        )}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cashRows.map((r) => {
          const pct = totalReady && totalUsd > 0 ? (r.value / totalUsd) * 100 : 0
          return (
            <div
              key={r.key}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:border-[#ccff00]/25 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                  {"logo" in r && r.logo ? <UsdgLogo size={12} /> : null}
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: r.color }}
                    aria-hidden
                  />
                  {r.label}
                </span>
                <span className="text-[10px] tabular-nums text-white/35">
                  {r.ready ? `${pct.toFixed(0)}%` : "…"}
                </span>
              </div>
              <p className="mt-2 truncate font-mono text-sm font-semibold tabular-nums text-white">
                {r.ready ? fmtUsd(r.value) : "…"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/40">{r.bal}</p>
            </div>
          )
        })}
      </div>

      <div className="relative mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Other tokens
          </p>
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            className="text-[11px] font-medium text-white/45 underline-offset-2 hover:text-[#ccff00] hover:underline"
          >
            {showEmpty ? "Hide empty" : "Show empty"}
          </button>
        </div>
        {stockRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-xs text-white/40">
            No RH stock tokens with balance.
          </p>
        ) : (
          <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
            {stockRows.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <span className="text-xs font-semibold text-white/70">{r.label}</span>
                <span className="text-right">
                  <span className="block font-mono text-xs tabular-nums text-white">
                    {r.ready && r.value > 0 ? fmtUsd(r.value) : r.ready ? r.bal : "…"}
                  </span>
                  {r.value > 0 ? (
                    <span className="block text-[10px] text-white/40">{r.bal}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative mt-4 flex flex-wrap gap-4 text-xs text-white/45">
        <span>
          Cash{" "}
          <span className="font-semibold text-white">
            {cashReady ? fmtUsd(cashUsd) : "…"}
          </span>
        </span>
        <span>
          Sherd NAV{" "}
          <span className="font-semibold text-[#ccff00]">
            {sherdReady ? fmtUsd(sherdNavUsd) : "…"}
          </span>
        </span>
      </div>
    </section>
  )
}
