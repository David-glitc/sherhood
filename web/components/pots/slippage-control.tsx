"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export const SLIPPAGE_PRESETS = [0.5, 1, 3] as const
export const DEFAULT_SLIPPAGE_PCT = 1

/**
 * Min USDG out (token units) for an ETH/WETH deposit given a USD estimate
 * of the input and the user's slippage tolerance. Returns 0n when no price
 * is available — the swap then executes unprotected, which the UI flags.
 */
export function minUsdgOutFor(
  usdEstimate: number | null,
  slippagePct: number,
  usdgDecimals = 6
): bigint {
  if (usdEstimate == null || !Number.isFinite(usdEstimate) || usdEstimate <= 0) return 0n
  const pct = Math.min(Math.max(slippagePct, 0), 50)
  const minUsd = usdEstimate * (1 - pct / 100)
  return BigInt(Math.floor(minUsd * 10 ** usdgDecimals))
}

export function SlippageControl({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number
  onChange: (pct: number) => void
  disabled?: boolean
  className?: string
}) {
  const [customStr, setCustomStr] = useState("")
  const isPreset = SLIPPAGE_PRESETS.includes(value as (typeof SLIPPAGE_PRESETS)[number])

  const onCustom = (raw: string) => {
    setCustomStr(raw)
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0 && n <= 50) onChange(n)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Max slippage
        </span>
        {value >= 5 && (
          <span className="text-[11px] font-semibold text-amber-400">high tolerance</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SLIPPAGE_PRESETS.map((pct) => (
          <button
            key={pct}
            type="button"
            disabled={disabled}
            aria-pressed={isPreset && value === pct}
            onClick={() => {
              setCustomStr("")
              onChange(pct)
            }}
            className={cn(
              "touch-target rounded-lg border px-2 text-xs font-semibold transition-colors",
              isPreset && value === pct
                ? "border-sherhood bg-sherhood/10 text-sherhood"
                : "border-white/10 text-white/40 hover:border-white/25 disabled:opacity-30"
            )}
          >
            {pct}%
          </button>
        ))}
        <div
          className={cn(
            "touch-target flex min-w-0 items-center rounded-lg border px-3 transition-colors",
            !isPreset && customStr
              ? "border-sherhood text-sherhood"
              : "border-white/10 text-white/40 focus-within:border-white/25"
          )}
        >
          <input
            aria-label="Custom maximum slippage percentage"
            type="number"
            min="0.05"
            max="50"
            step="0.1"
            inputMode="decimal"
            placeholder="Custom"
            disabled={disabled}
            value={customStr}
            onChange={(e) => onCustom(e.target.value)}
            className="min-w-0 w-full bg-transparent py-2 text-center text-xs font-semibold placeholder:text-white/25"
          />
          <span className="text-xs font-semibold">%</span>
        </div>
      </div>
    </div>
  )
}
