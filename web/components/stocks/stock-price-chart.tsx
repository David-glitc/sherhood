"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type SeriesPoint = { t: number; c: number }

type ChartPayload = {
  symbol: string
  price: number
  changePct: number
  series: SeriesPoint[]
}

type StockPriceChartProps = {
  symbol: string
  className?: string
  height?: number
  showPrice?: boolean
}

const VIEW_W = 88

function sparkPath(series: SeriesPoint[], width: number, height: number): string {
  if (series.length < 2) return ""
  const prices = series.map((p) => p.c)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const step = width / (series.length - 1)
  return series
    .map((p, i) => {
      const x = i * step
      const y = height - ((p.c - min) / span) * (height - 4) - 2
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
}

export function StockPriceChart({
  symbol,
  className,
  height = 36,
  showPrice = true,
}: StockPriceChartProps) {
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

  const up = (data?.changePct ?? 0) >= 0
  const stroke = up ? "#ccff00" : "#f87171"
  const path = useMemo(
    () => (data?.series ? sparkPath(data.series, VIEW_W, height) : ""),
    [data, height]
  )

  // Reserve identical space for loading / failed / loaded — no layout shift.
  const totalHeight = height + (showPrice ? 16 : 0)

  return (
    <div
      className={cn("flex w-full min-w-0 max-w-[88px] flex-col justify-end gap-1", className)}
      style={{ height: totalHeight }}
    >
      {showPrice && (
        <div className="flex h-[12px] items-baseline justify-between gap-2 text-[10px] leading-none tabular-nums">
          {data ? (
            <>
              <span className="truncate font-bold text-white/75">
                ${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span
                className={cn("shrink-0 font-semibold", up ? "text-sherhood" : "text-red-400")}
              >
                {up ? "+" : ""}
                {data.changePct.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="text-white/25">{failed ? "—" : "…"}</span>
          )}
        </div>
      )}
      {data ? (
        <svg
          viewBox={`0 0 ${VIEW_W} ${height}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label={`${symbol} 5-day price chart`}
        >
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div
          className={cn("w-full rounded-md bg-white/[0.04]", !failed && "animate-pulse")}
          style={{ height }}
          aria-hidden
        />
      )}
    </div>
  )
}
