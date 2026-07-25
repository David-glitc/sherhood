"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"

/** Mark vs cost bars — updates with live mark. */
export function MarkCostChart({
  markUsd,
  costUsd,
  className,
  height = 140,
}: {
  markUsd: number
  costUsd: number
  className?: string
  height?: number
}) {
  const data = useMemo(
    () => [
      { key: "Cost", value: Math.max(0, costUsd) },
      { key: "Mark", value: Math.max(0, markUsd) },
    ],
    [markUsd, costUsd]
  )
  const pnl = markUsd - costUsd
  const up = pnl >= 0

  return (
    <div className={cn("w-full", className)}>
      <div style={{ height }} role="img" aria-label="Mark versus cost basis">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="key"
              tick={{ fill: "#888", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #333",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [
                `$${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                "",
              ]}
            />
            <Bar dataKey="value" radius={[8, 8, 4, 4]} maxBarSize={56} isAnimationActive>
              {data.map((d) => (
                <Cell
                  key={d.key}
                  fill={d.key === "Mark" ? (up ? "#ccff00" : "#f87171") : "#444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p
        className={cn(
          "mt-1 text-center text-xs font-semibold tabular-nums",
          up ? "text-[#ccff00]" : "text-red-400"
        )}
      >
        {up ? "+" : ""}
        ${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} PnL
      </p>
    </div>
  )
}
