"use client"

import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { tradingViewChartUrl } from "@/lib/stock-links"
import { cn } from "@/lib/utils"

type SeriesPoint = { t: number; c: number }

type ChartPayload = {
  symbol: string
  price: number
  changePct: number
  series: SeriesPoint[]
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: SeriesPoint }[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-[#333333] bg-black/90 px-2.5 py-1.5 text-[11px] text-[#e5e7eb]">
      <p className="font-semibold tabular-nums">
        ${point.c.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      <p className="text-[#777777]">
        {new Date(point.t * 1000).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  )
}

/** Larger token chart tile for basket surfaces */
export function TokenChartCard({
  symbol,
  className,
}: {
  symbol: string
  className?: string
}) {
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
            <a
              href={tradingViewChartUrl(symbol)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] font-semibold text-[#e5e7eb] hover:text-[#ccff00]"
              title={`Open ${symbol} on TradingView`}
            >
              {symbol}
            </a>
            {data ? (
              <p className="mt-0.5 text-[12px] text-[#999999]">
                ${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="mt-0.5 h-3 w-12 animate-pulse rounded bg-[#191919]" />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
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
          <a
            href={tradingViewChartUrl(symbol)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium uppercase tracking-wider text-[#666666] hover:text-[#ccff00]"
          >
            TradingView ↗
          </a>
        </div>
      </div>

      <div className="mt-3">
        {failed ? (
          <div className="flex h-[80px] items-center justify-center text-[12px] text-[#444444]">
            Chart unavailable
          </div>
        ) : !data || data.series.length < 2 ? (
          <div className="h-[80px] animate-pulse rounded-[14px] bg-[#111]" />
        ) : (
          <div className="h-[80px]" role="img" aria-label={`${symbol} 5-day chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "#444444", strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="c"
                  stroke={stroke}
                  strokeWidth={2}
                  fill={`url(#fill-${symbol})`}
                  dot={false}
                  activeDot={{ r: 3, fill: stroke, stroke: "none" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
