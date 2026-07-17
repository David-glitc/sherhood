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
  const previewSymbols = BASKET_STOCKS.slice(0, 4).map((s) => s.symbol)

  useEffect(() => {
    fetch("/api/pots")
      .then((r) => (r.ok ? r.json() : { open: [] }))
      .then((json: { open: PotSummary[] }) => setOpen(json.open ?? []))
      .catch(() => setOpen([]))
  }, [])

  if (open.length === 0) return null

  return (
    <section className={cn("mx-auto max-w-5xl px-4 py-14", className)}>
      <div className="mb-8 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">
            Live now
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Running baskets</h2>
        </div>
        <Link
          href="/app"
          className="text-sm font-semibold text-sherhood hover:brightness-110"
        >
          View all →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {open.map((pot) => (
          <Link
            key={pot.address}
            href={`/basket/${pot.address}`}
            className="group rounded-[1.25rem] border border-white/[0.08] bg-[#070707] p-5 transition hover:border-sherhood/35"
          >
            <div className="mb-3 flex items-center justify-between">
              <StockLogoStack symbols={previewSymbols} size={28} max={4} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-sherhood">
                {pot.statusLabel}
              </span>
            </div>
            <p className="text-lg font-bold text-white/90">Multi-stock basket</p>
            <p className="mt-1 text-xs text-white/35">
              {pot.participantCount} funder{Number(pot.participantCount) === 1 ? "" : "s"}
            </p>
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/40">
                <span className="inline-flex items-center gap-1">
                  {pot.totalDepositedFmt} / {pot.fundingGoalFmt} <UsdgLogo size={12} />
                </span>
                <span>{pot.progressPct.toFixed(0)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-sherhood transition-all"
                  style={{ width: `${pot.progressPct}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
