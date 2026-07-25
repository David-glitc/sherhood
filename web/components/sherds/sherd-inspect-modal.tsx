"use client"

import { useMemo } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { TradingViewSymbolTabs } from "@/components/stocks/tradingview-mini"
import { buttonVariants } from "@/components/ui/button"
import { useStockPrices } from "@/hooks/use-stock-prices"
import { fmtUsdg, ownershipPct, RARITIES, stockAmountToNumber } from "@/hooks/use-pots"
import { cn } from "@/lib/utils"

export type SherdInspectData = {
  tokenId: bigint
  rarityIdx: number
  revealed: boolean
  ownershipWeight: bigint
  depositAmount: bigint
  pot: `0x${string}`
  potLabel: string
  holdings: { symbol: string; amount: bigint }[]
  listingEth?: string
  listingCurrency?: string
}

type SherdInspectModalProps = {
  open: boolean
  onClose: () => void
  sherd: SherdInspectData | null
}

const OWNERSHIP_ONE = 10n ** 18n

/** Gallery peek: 360 spin + shimmer + vault marks + mint deposit. */
export function SherdInspectModal({ open, onClose, sherd }: SherdInspectModalProps) {
  const symbols = useMemo(
    () => (sherd?.holdings ?? []).map((h) => h.symbol).filter(Boolean),
    [sherd]
  )
  const { quotes, loading: quotesLoading } = useStockPrices(
    open && sherd?.revealed ? symbols : []
  )

  const markUsd = useMemo(() => {
    if (!sherd?.revealed || !sherd.holdings.length) return null
      let total = 0
      for (const h of sherd.holdings) {
        const px = quotes[h.symbol.toUpperCase()]?.price ?? 0
        if (px <= 0) continue
        const units = stockAmountToNumber((h.amount * sherd.ownershipWeight) / OWNERSHIP_ONE)
        total += units * px
      }
      return total
    }, [sherd, quotes])

  if (!open || !sherd) return null

  const sleekLabel = sherd.revealed
    ? symbols.length
      ? `${symbols.length} vault assets`
      : "Revealed"
    : "Sealed"

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/85 p-3 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal
      aria-label={`Sherd #${String(sherd.tokenId)}`}
      onClick={onClose}
    >
      <div
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-white/10 bg-[#070707] p-4 shadow-[0_0_80px_rgba(204,255,0,0.08)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/70"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto w-full max-w-[240px] [perspective:900px]">
          <div className="relative sherd-spin-3d hover:[animation-play-state:paused]">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 rounded-full bg-[#ccff00]/15 blur-3xl"
            />
            <PotNftCard
              rarityIndex={sherd.rarityIdx}
              revealed={sherd.revealed}
              tokenId={sherd.tokenId}
              stockLabel={sleekLabel}
              ownershipPct={
                sherd.revealed ? ownershipPct(sherd.ownershipWeight) : undefined
              }
              size="fill"
              interactive
              tilt={false}
              className="relative"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            >
              <div className="sherd-inspect-shimmer absolute inset-0" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <CardStateBadge revealed={sherd.revealed} claimed={false} />
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
            {RARITIES[sherd.rarityIdx] ?? "Sherd"} · #{String(sherd.tokenId)}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Minted</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white">
              ${fmtUsdg(sherd.depositAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Vault mark</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-[#ccff00]">
              {sherd.revealed
                ? quotesLoading && markUsd == null
                  ? "…"
                  : markUsd != null
                    ? `$${markUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : "—"
                : "Sealed"}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Ask</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white">
              {sherd.listingEth
                ? `${sherd.listingEth} ${sherd.listingCurrency ?? "ETH"}`
                : "—"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/40">{sherd.potLabel}</p>

        {sherd.revealed && symbols.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <p className="border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/40">
              Vault marks
            </p>
            <TradingViewSymbolTabs symbols={symbols} height={160} className="p-2" />
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-white/35">
            Sealed — vault marks unlock at reveal.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <Link
            href={`/sherds/${String(sherd.tokenId)}`}
            className={cn(buttonVariants(), "flex-1")}
            onClick={onClose}
          >
            Open Sherd
          </Link>
          <Link
            href={`/pools/${sherd.pot}`}
            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            onClick={onClose}
          >
            Pool
          </Link>
        </div>
      </div>
    </div>
  )
}
