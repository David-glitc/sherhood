"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProtocolStatsData } from "@/lib/protocol-stats-data"

export type { ProtocolStatsData }

function feeDisplay(stats: ProtocolStatsData | null): string {
  const raw =
    stats?.revenue?.lifetimeFeesFmt ?? stats?.volume?.lifetimeFeesFmt ?? null
  if (raw == null || raw === "") return "—"
  const cleaned = String(raw).replace(/^\$/, "").trim()
  if (!cleaned || cleaned === "—") return "—"
  return `$${cleaned}`
}

export function ProtocolStats({
  initial = null,
}: {
  initial?: ProtocolStatsData | null
}) {
  const [stats, setStats] = useState<ProtocolStatsData | null>(initial)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/stats", { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("stats unavailable")
        return response.json() as Promise<ProtocolStatsData>
      })
      .then((data) => {
        setStats(data)
        setFailed(false)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        if (!initial) setFailed(true)
      })
    return () => controller.abort()
  }, [initial])

  const ready = Boolean(stats) || failed
  const fees = feeDisplay(stats)

  const items = [
    {
      label: "Live pools",
      value: stats ? stats.pools.live.toLocaleString() : "—",
    },
    {
      label: "Vault TVL",
      value: stats ? `$${stats.volume.fundingTvlFmt}` : "—",
    },
    {
      label: "Lifetime fees",
      value: fees,
    },
    {
      label: "Depositors",
      value: stats ? Number(stats.users.uniqueDepositors).toLocaleString() : "—",
    },
  ]

  return (
    <section aria-label="Protocol activity" className="product-surface-subtle overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            {ready ? (
              <p
                className={
                  item.label === "Lifetime fees"
                    ? "mt-2 whitespace-nowrap text-xl font-semibold tabular-nums text-[#ccff00] sm:text-2xl"
                    : "mt-2 whitespace-nowrap text-xl font-semibold tabular-nums text-foreground sm:text-2xl"
                }
                title={
                  item.label === "Lifetime fees"
                    ? "All-time protocol USDG fees forwarded to the fee wallet"
                    : undefined
                }
              >
                {item.value}
              </p>
            ) : (
              <Skeleton className="mt-2 h-7 w-24" />
            )}
          </div>
        ))}
      </div>
      {failed && !stats ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Live protocol totals are temporarily unavailable. Pool data below is still current.
        </p>
      ) : null}
    </section>
  )
}
