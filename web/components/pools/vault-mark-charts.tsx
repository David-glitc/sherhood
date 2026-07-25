"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts"
import { stockAmountToNumber, type PotHolding } from "@/hooks/use-pots"
import { StockLogo } from "@/components/stocks/stock-logo"
import { StockPriceChart } from "@/components/stocks/stock-price-chart"
import { TradingViewSymbolTabs } from "@/components/stocks/tradingview-mini"
import { cn } from "@/lib/utils"

type SeriesPoint = { t: number; c: number }
type ChartPayload = {
  symbol: string
  price: number
  changePct: number
  series: SeriesPoint[]
}

type VaultMarkChartsProps = {
  holdings: PotHolding[]
  className?: string
}

/** Live per-stock sparklines + vault mark USD chart from quote history. */
export function VaultMarkCharts({ holdings, className }: VaultMarkChartsProps) {
  const symbols = useMemo(
    () => holdings.map((h) => h.symbol.toUpperCase()).filter(Boolean),
    [holdings]
  )
  const [charts, setCharts] = useState<Record<string, ChartPayload>>({})

  useEffect(() => {
    if (symbols.length === 0) {
      setCharts({})
      return
    }
    let cancelled = false
    Promise.all(
      symbols.map((sym) =>
        fetch(`/api/stocks/${sym}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((json: ChartPayload | null) => (json?.symbol ? json : null))
          .catch(() => null)
      )
    ).then((rows) => {
      if (cancelled) return
      const next: Record<string, ChartPayload> = {}
      for (const row of rows) {
        if (row?.symbol) next[row.symbol.toUpperCase()] = row
      }
      setCharts(next)
    })
    return () => {
      cancelled = true
    }
  }, [symbols.join(",")])

  const markNow = useMemo(() => {
    let total = 0
    let n = 0
    for (const h of holdings) {
      const px = charts[h.symbol.toUpperCase()]?.price ?? 0
      if (px <= 0) continue
      total += stockAmountToNumber(h.amount) * px
      n += 1
    }
    return n > 0 ? total : null
  }, [holdings, charts])

  const vaultSeries = useMemo(() => {
    if (holdings.length === 0) return []
    const seriesList = holdings.map((h) => {
      const q = charts[h.symbol.toUpperCase()]
      const units = stockAmountToNumber(h.amount)
      const series = q?.series ?? []
      return series.map((p) => ({ t: p.t, v: p.c * units }))
    })
    const maxLen = Math.max(0, ...seriesList.map((s) => s.length))
    if (maxLen < 2) return []
    const out: { t: number; v: number }[] = []
    for (let i = 0; i < maxLen; i++) {
      let sum = 0
      let t = 0
      let ok = 0
      for (const s of seriesList) {
        const idx = s.length - maxLen + i
        if (idx < 0 || !s[idx]) continue
        sum += s[idx].v
        t = s[idx].t
        ok += 1
      }
      if (ok > 0) out.push({ t, v: sum })
    }
    return out
  }, [holdings, charts])

  if (holdings.length === 0) return null

  const up =
    vaultSeries.length >= 2
      ? vaultSeries[vaultSeries.length - 1]!.v >= vaultSeries[0]!.v
      : true
  const stroke = up ? "#ccff00" : "#f87171"

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="rounded-[22px] border border-[#222222] bg-[#0a0a0a]/90 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] tracking-[0.12em] text-[#666666]">VAULT MARK · 5D</p>
          <p className="text-sm font-semibold tabular-nums text-white/90">
            {markNow != null
              ? `$${markNow.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "…"}
          </p>
        </div>
        <div className="mt-3 h-[88px] w-full">
          {vaultSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vaultSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="vaultMarkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelFormatter={() => ""}
                  formatter={(v) => [
                    `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    "Mark",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={stroke}
                  fill="url(#vaultMarkFill)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center text-xs text-white/35">
              Chart builds once quotes load.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-[22px] border border-[#222222] bg-[#0a0a0a]/90 p-4 sm:p-5">
        <p className="text-[11px] tracking-[0.12em] text-[#666666]">HOLDING CHARTS</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {holdings.map((h) => (
            <li
              key={h.token}
              className="flex items-center gap-3 rounded-[14px] border border-white/5 bg-black/40 px-3 py-2.5"
            >
              <StockLogo symbol={h.symbol} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white/80">{h.symbol}</p>
                <StockPriceChart
                  symbol={h.symbol}
                  height={32}
                  showPrice
                  className="mt-1 max-w-none"
                />
              </div>
            </li>
          ))}
        </ul>
        {symbols.length > 0 ? (
          <div className="mt-4">
            <TradingViewSymbolTabs symbols={symbols} height={160} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
