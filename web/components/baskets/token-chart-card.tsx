"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { cn } from "@/lib/utils"

type SeriesPoint = { t: number; c: number }

type ChartPayload = {
  symbol: string
  price: number
  changePct: number
  series: SeriesPoint[]
}

function buildPaths(series: SeriesPoint[], width: number, height: number) {
  if (series.length < 2) return { line: "", area: "" }
  const prices = series.map((p) => p.c)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const step = width / (series.length - 1)
  const pts = series.map((p, i) => {
    const x = i * step
    const y = height - ((p.c - min) / span) * (height - 8) - 4
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")
  const area = `${line} L${width},${height} L0,${height} Z`
  return { line, area }
}

/** Larger token chart tile for basket surfaces */
export function TokenChartCard({
  symbol,
  className,
}: {
  symbol: string
  className?: string
}) {
  const gid = useId().replace(/:/g, "")
  const [data, setData] = useState<ChartPayload | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/stocks/${symbol}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: ChartPayload) => {
        if (!cancelled) {
          setData(json)
          setFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  const width = 220
  const height = 72
  const up = (data?.changePct ?? 0) >= 0
  const stroke = up ? "#ccff00" : "#f87171"
  const paths = useMemo(
    () => (data?.series ? buildPaths(data.series, width, height) : { line: "", area: "" }),
    [data]
  )

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[18px] border border-[#333333] bg-[#0a0a0a] p-4 transition hover:border-[#ccff00]/35",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StockLogoStack symbols={[symbol]} size={28} max={1} />
          <div>
            <p className="text-[14px] font-semibold text-[#e5e7eb]">{symbol}</p>
            {data ? (
              <p className="mt-0.5 text-[12px] text-[#999999]">
                ${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="mt-0.5 h-3 w-12 animate-pulse rounded bg-[#191919]" />
            )}
          </div>
        </div>
        {data ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              up ? "bg-[#ccff00]/15 text-[#ccff00]" : "bg-red-500/15 text-red-400"
            )}
          >
            {up ? "+" : ""}
            {data.changePct.toFixed(2)}%
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        {failed ? (
          <div className="flex h-[72px] items-center justify-center text-[12px] text-[#444444]">
            Chart unavailable
          </div>
        ) : !data ? (
          <div className="h-[72px] animate-pulse rounded-[14px] bg-[#111]" />
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[72px] w-full overflow-visible token-chart-draw"
            aria-label={`${symbol} 5-day chart`}
          >
            <defs>
              <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={paths.area} fill={`url(#fill-${gid})`} className="token-chart-fill" />
            <path
              d={paths.line}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="token-chart-line"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
