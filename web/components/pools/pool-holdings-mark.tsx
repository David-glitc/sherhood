"use client"

import { useMemo } from "react"
import { useStockPrices } from "@/hooks/use-stock-prices"
import {
  fmtTokenAmount,
  stockAmountToNumber,
  usdgToDollars,
  type PotHolding,
} from "@/hooks/use-pots"
import { cn } from "@/lib/utils"

type PoolHoldingsMarkProps = {
  holdings: PotHolding[]
  totalDeposited: bigint
  status: number
  /** Claims completed (on-chain claimCount). */
  claimCount?: bigint
  participantCount?: bigint
  /** When true, amounts are live vault ERC20 balances (post-claim remaining). */
  amountsAreLive?: boolean
  /** Protocol fee bps — book uses post-fee capital (matches purchase pull). */
  protocolFeeBps?: bigint
  className?: string
}

/** Live vault mark vs deposit book — PnL when holdings exist. */
export function PoolHoldingsMark({
  holdings,
  totalDeposited,
  status,
  claimCount,
  participantCount,
  amountsAreLive = false,
  protocolFeeBps = 0n,
  className,
}: PoolHoldingsMarkProps) {
  const symbols = useMemo(() => holdings.map((h) => h.symbol).filter(Boolean), [holdings])
  const { quotes, loading } = useStockPrices(holdings.length > 0 ? symbols : [])

  const markUsd = useMemo(() => {
    if (!holdings.length) return null
    let total = 0
    let priced = 0
    for (const h of holdings) {
      const px = quotes[h.symbol.toUpperCase()]?.price ?? 0
      if (px <= 0) continue
      total += stockAmountToNumber(h.amount) * px
      priced += 1
    }
    if (priced === 0) return null
    return total
  }, [holdings, quotes])

  const grossBook = usdgToDollars(totalDeposited)
  const feeBps = Number(protocolFeeBps)
  const protocolFeeUsd =
    feeBps > 0 && Number.isFinite(feeBps) ? (grossBook * feeBps) / 10_000 : 0
  // Post-fee book = capital available for stock purchase (matches pullForPurchase).
  const book = Math.max(0, grossBook - protocolFeeUsd)
  const claimsDone = claimCount != null ? Number(claimCount) : 0
  const claimsTotal = participantCount != null ? Number(participantCount) : 0
  // After any claims, vault mark is remaining stock — don't fake PnL vs full deposit book.
  const showPnl = !amountsAreLive || claimsDone === 0
  const pnl = showPnl && markUsd != null ? markUsd - book : null
  const pnlPct = pnl != null && book > 0 ? (pnl / book) * 100 : null

  if (holdings.length === 0) {
    return (
      <div className={cn("rounded-[22px] border border-[#222222] bg-[#0a0a0a]/90 p-4 sm:p-5", className)}>
        <p className="text-[11px] tracking-[0.12em] text-[#666666]">HOLDINGS</p>
        <p className="mt-2 text-[14px] text-white/45">
          {status === 0
            ? "Vault fills after seal + buy — slots stay quiet until then."
            : status === 1
              ? "Sealed. Waiting on stock purchase."
              : "No holdings yet."}
        </p>
      </div>
    )
  }

  return (
    <div className={cn("rounded-[22px] border border-[#222222] bg-[#0a0a0a]/90 p-4 sm:p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] tracking-[0.12em] text-[#666666]">
          {amountsAreLive ? "VAULT · LIVE" : "HOLDINGS · MARK"}
        </p>
        <p className="text-[11px] text-[#555555]">
          {holdings.length} assets
          {claimsTotal > 0 ? ` · ${claimsDone}/${claimsTotal} claimed` : ""}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-[14px] border border-[#1a1a1a] bg-black/50 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">
            {amountsAreLive ? "Remaining" : "Mark"}
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums text-white/90">
            {loading && markUsd == null
              ? "…"
              : markUsd != null
                ? `$${markUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : "—"}
          </p>
        </div>
        <div className="rounded-[14px] border border-[#1a1a1a] bg-black/50 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">
            Book{protocolFeeUsd > 0 ? " · net" : ""}
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums text-white/90">
            ${book.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-[14px] border border-[#1a1a1a] bg-black/50 px-3 py-3 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">PnL</p>
          <p
            className={cn(
              "mt-1 text-sm font-medium tabular-nums",
              pnl == null
                ? "text-white/50"
                : pnl >= 0
                  ? "text-[#ccff00]"
                  : "text-red-400"
            )}
          >
            {pnl == null
              ? claimsDone > 0
                ? "n/a"
                : "—"
              : `${pnl >= 0 ? "+" : ""}$${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}${
                  pnlPct != null ? ` (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)` : ""
                }`}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {holdings.map((h) => {
          const px = quotes[h.symbol.toUpperCase()]?.price ?? 0
          const units = stockAmountToNumber(h.amount)
          const line = px > 0 ? units * px : null
          return (
            <li
              key={h.token}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-white/5 bg-black/40 px-3 py-2 text-[13px]"
            >
              <span className="font-medium text-white/85">{h.symbol}</span>
              <span className="tabular-nums text-white/45">{fmtTokenAmount(h.amount)}</span>
              <span className="tabular-nums text-white/70">
                {line != null
                  ? `$${line.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[10px] leading-relaxed text-white/30">
        {amountsAreLive
          ? "Amounts are live vault token balances — they drop when Sherds are claimed and burned."
          : protocolFeeUsd > 0
            ? `Book is post-protocol-fee capital (~$${protocolFeeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} fee). Dividends not included.`
            : "Dividends coming soon — not included in mark."}
      </p>
    </div>
  )
}
