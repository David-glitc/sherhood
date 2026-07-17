"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

type Stats = {
  pools: { total: number; live: number; processing: number; ended: number }
  cards: { active: string }
  users: { uniqueDepositors: string }
  volume: { fundingTvlFmt: string }
}

const fallbackStats = [
  { label: "Live baskets", value: "—" },
  { label: "Funding TVL", value: "—" },
  { label: "Active cards", value: "—" },
  { label: "Depositors", value: "—" },
]

export function ProtocolStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/stats", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("stats unavailable")
        return response.json() as Promise<Stats>
      })
      .then(setStats)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true)
      })
    return () => controller.abort()
  }, [])

  const items = stats
    ? [
        { label: "Live baskets", value: stats.pools.live.toLocaleString() },
        { label: "Funding TVL", value: `$${stats.volume.fundingTvlFmt}` },
        { label: "Active cards", value: Number(stats.cards.active).toLocaleString() },
        { label: "Depositors", value: Number(stats.users.uniqueDepositors).toLocaleString() },
      ]
    : fallbackStats

  return (
    <section aria-label="Protocol activity" className="product-surface-subtle overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            {stats || failed ? (
              <p className="mt-2 truncate text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                {failed ? "—" : item.value}
              </p>
            ) : (
              <Skeleton className="mt-2 h-7 w-20" />
            )}
          </div>
        ))}
      </div>
      {failed && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Live protocol totals are temporarily unavailable. Basket data below is still current.
        </p>
      )}
    </section>
  )
}
