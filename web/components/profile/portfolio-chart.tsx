"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { usdgToDollars } from "@/hooks/use-pots"
import { cn } from "@/lib/utils"

export type TimelinePoint = { t: number; v: string }

type ChartDatum = { t: number; v: number }

function PortfolioTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartDatum }[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-black/90 px-3 py-2 text-xs">
      <p className="font-semibold tabular-nums text-foreground">
        ${point.v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {new Date(point.t * 1000).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
        })}
      </p>
    </div>
  )
}

export function PortfolioChart({
  timeline,
  className,
  height = 160,
}: {
  timeline: TimelinePoint[]
  className?: string
  height?: number
}) {
  const points = useMemo<ChartDatum[]>(() => {
    const parsed = timeline.map((p) => ({
      t: p.t,
      v: usdgToDollars(BigInt(p.v || "0")),
    }))
    if (parsed.length === 1) {
      return [{ t: parsed[0].t - 3600, v: 0 }, ...parsed]
    }
    return parsed
  }, [timeline])

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground",
          className
        )}
        style={{ height }}
      >
        Chart appears after your first deposit.
      </div>
    )
  }

  const latest = points[points.length - 1].v
  const first = points[0].v
  const up = latest >= first
  const stroke = up ? "#ccff00" : "#f87171"
  const gradId = `portfolio-fill-${up ? "up" : "dn"}`

  return (
    <div className={cn("w-full", className)}>
      <div style={{ height }} role="img" aria-label="Net principal over time">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
            <YAxis domain={[0, "dataMax"]} hide />
            <Tooltip
              content={<PortfolioTooltip />}
              cursor={{ stroke: "#444444", strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 3.5, fill: stroke, stroke: "none" }}
              isAnimationActive
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(points[0].t * 1000).toLocaleDateString()}</span>
        <span>
          Now{" "}
          <span className={cn("font-semibold tabular-nums", up ? "text-[#ccff00]" : "text-red-400")}>
            ${latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </span>
      </div>
    </div>
  )
}
