"use client"

import { useMemo } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

export type AllocationSlice = {
  key: string
  label: string
  value: number
  color: string
}

function AllocTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: AllocationSlice }[]
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]
  return (
    <div className="rounded-lg border border-border bg-black/90 px-3 py-2 text-xs">
      <p className="font-semibold text-foreground">{row.name}</p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">
        ${row.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

/** Donut + legend for portfolio allocation (cash / Sherds / stocks). */
export function AllocationChart({
  slices,
  className,
  height = 160,
}: {
  slices: AllocationSlice[]
  className?: string
  height?: number
}) {
  const data = useMemo(
    () => slices.filter((s) => s.value > 0.001),
    [slices]
  )
  const total = data.reduce((sum, s) => sum + s.value, 0)

  if (data.length === 0 || total <= 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground",
          className
        )}
        style={{ height }}
      >
        Allocation appears when you hold value.
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive
              animationDuration={500}
            >
              {data.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<AllocTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-sm font-bold tabular-nums text-[#ccff00]">
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((s) => {
          const pct = (s.value / total) * 100
          return (
            <li key={s.key} className="flex items-center gap-2 text-xs">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
              <span className="tabular-nums font-medium text-foreground">
                {pct.toFixed(0)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
