"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts"
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
      {data && data.series.length > 1 ? (
        <div style={{ height }} aria-label={`${symbol} 5-day price chart`} role="img">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Area
                type="monotone"
                dataKey="c"
                stroke={stroke}
                strokeWidth={1.75}
                fill={`url(#spark-${symbol})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
