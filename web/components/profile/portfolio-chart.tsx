"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

export type TimelinePoint = { t: number; v: string }

const VIEW_W = 560
const VIEW_H = 160

function buildPaths(points: { t: number; v: number }[]) {
  const values = points.map((p) => p.v)
  const min = Math.min(...values, 0)
  const max = Math.max(...values)
  const span = max - min || 1
  const t0 = points[0].t
  const t1 = points[points.length - 1].t
  const tSpan = t1 - t0 || 1

  const coords = points.map((p) => ({
    x: ((p.t - t0) / tSpan) * VIEW_W,
    y: VIEW_H - 8 - ((p.v - min) / span) * (VIEW_H - 24),
  }))

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ")
  const area = `${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`
  return { line, area, max }
}

export function PortfolioChart({
  timeline,
  className,
}: {
  timeline: TimelinePoint[]
  className?: string
}) {
  const points = useMemo(() => {
    const parsed = timeline.map((p) => ({ t: p.t, v: Number(p.v) / 1e18 }))
    if (parsed.length === 1) {
      // Draw a flat line for a single event so the chart is still readable.
      return [{ t: parsed[0].t - 3600, v: 0 }, ...parsed]
    }
    return parsed
  }, [timeline])

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground",
          className
        )}
      >
        Your portfolio chart appears after your first deposit.
      </div>
    )
  }

  const { line, area } = buildPaths(points)
  const latest = points[points.length - 1].v
  const first = points[0].v
  const up = latest >= first

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Deposited portfolio value over time in USDG"
      >
        <defs>
          <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ccff00" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#portfolio-fill)" />
        <path
          d={line}
          fill="none"
          stroke={up ? "#ccff00" : "#f87171"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(points[0].t * 1000).toLocaleDateString()}</span>
        <span>
          Now:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {latest.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG
          </span>
        </span>
      </div>
    </div>
  )
}
