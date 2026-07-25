"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { cn } from "@/lib/utils"

type PotSummary = {
  address: string
  status: number
  statusLabel: string
  progressPct: number
  fundingGoalFmt: string
  totalDepositedFmt: string
  participantCount: string
}

export function LiveBasketsSection({ className }: { className?: string }) {
  const [open, setOpen] = useState<PotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const previewSymbols = BASKET_STOCKS.slice(0, 4).map((s) => s.symbol)

  useEffect(() => {
    fetch("/api/pots")
      .then((r) => (r.ok ? r.json() : { open: [] }))
      .then((json: { open: PotSummary[] }) => setOpen(json.open ?? []))
      .catch(() => setOpen([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className={cn("page-container-wide py-16 sm:py-20", className)}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            On chain now
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Open Sherd pools</h2>
        </div>
        <Link
          href="/app"
          className="touch-target inline-flex items-center text-sm font-semibold text-primary hover:underline"
        >
          View all pools
        </Link>
      </div>

      {loading ? (
        <div className="product-surface h-52 animate-pulse" aria-label="Loading live pools" />
      ) : open.length === 0 ? (
        <div className="product-surface grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8">
          <div>
            <h3 className="text-xl font-semibold">The next Sherd pool is being prepared.</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Open Sherd pools appear here as soon as funding starts. You can still review cards, fees, and the full user flow.
            </p>
          </div>
          <Link href="/docs/getting-started" className="touch-target inline-flex items-center text-sm font-semibold text-primary hover:underline">
            Read the guide
          </Link>
        </div>
      ) : (
      <div className="responsive-grid">
        {open.map((pot) => (
          <Link
            key={pot.address}
            href={`/pools/${pot.address}`}
            className="product-surface group p-5 transition-colors hover:border-primary/40"
          >
            <div className="mb-3 flex items-center justify-between">
              <StockLogoStack symbols={previewSymbols} size={28} max={4} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-sherhood">
                {pot.statusLabel}
              </span>
            </div>
            <p className="text-lg font-bold text-foreground">Multi-stock pool</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pot.participantCount} funder{Number(pot.participantCount) === 1 ? "" : "s"}
            </p>
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {pot.totalDepositedFmt} / {pot.fundingGoalFmt} <UsdgLogo size={12} />
                </span>
                <span>{pot.progressPct.toFixed(0)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Pool funding progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pot.progressPct)}>
                <div
                  className="h-full rounded-full bg-sherhood transition-all"
                  style={{ width: `${pot.progressPct}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}
    </section>
  )
}
