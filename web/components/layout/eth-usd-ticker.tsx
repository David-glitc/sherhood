"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type Spot = {
  ethUsd: number
  changePct24h: number | null
  source: string
  updatedAt?: string
}

export function EthUsdTicker({ className = "" }: { className?: string }) {
  const [spot, setSpot] = useState<Spot | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const prev = useRef<number | null>(null)
  const [flash, setFlash] = useState<"up" | "down" | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/prices/eth")
      if (!res.ok) throw new Error("fail")
      const data = (await res.json()) as Spot
      if (!data.ethUsd) throw new Error("empty")
      if (prev.current != null && data.ethUsd !== prev.current) {
        setFlash(data.ethUsd > prev.current ? "up" : "down")
        window.setTimeout(() => setFlash(null), 900)
      }
      prev.current = data.ethUsd
      setSpot(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    const tick = async () => {
      if (!alive) return
      await load()
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [load])

  const price = spot
    ? spot.ethUsd.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : "—"

  const change = spot?.changePct24h
  const changeLabel =
    change == null || !Number.isFinite(change)
      ? null
      : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`

  const updatedLabel = spot?.updatedAt
    ? new Date(spot.updatedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="ETH price details"
        className={cn(
          "inline-flex h-9 items-center justify-end gap-1 rounded-full border px-2.5 sm:h-10 sm:min-w-[7.25rem] sm:gap-1.5 sm:px-3",
          "text-[11px] font-semibold tabular-nums tracking-wide backdrop-blur-xl transition-colors duration-500 sm:text-[12px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50",
          flash === "up" && "border-emerald-400/50 bg-emerald-400/15 text-emerald-100",
          flash === "down" && "border-red-400/50 bg-red-400/15 text-red-100",
          !flash && error && "border-red-400/30 bg-red-500/5 text-red-200/80",
          !flash && !error && "border-white/10 bg-white/[0.04] text-white/75"
        )}
      >
        {loading && !spot ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 animate-pulse rounded-full bg-white/20" />
            <span className="hidden h-3 w-10 animate-pulse rounded bg-white/15 sm:block" />
          </span>
        ) : (
          <>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
              ETH
            </span>
            <span className="text-white">${price}</span>
            {changeLabel ? (
              <span
                className={cn(
                  "hidden text-[10px] font-semibold sm:inline",
                  (change ?? 0) >= 0 ? "text-emerald-400/90" : "text-red-400/90"
                )}
              >
                {changeLabel}
              </span>
            ) : null}
          </>
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close ETH details"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] p-3 shadow-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              ETH / USD
            </p>
            {error && !spot ? (
              <p className="mt-2 text-sm text-red-300">Price unavailable</p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">${price}</p>
                {changeLabel ? (
                  <p
                    className={cn(
                      "mt-1 text-sm font-semibold tabular-nums",
                      (change ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    24h {changeLabel}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] text-white/40">
                  {updatedLabel ? `Updated ${updatedLabel}` : "Live"}
                  {spot?.source ? ` · ${spot.source}` : ""}
                </p>
              </>
            )}
            <div className="mt-3 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  void load()
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <RefreshCw className="size-3" aria-hidden />
                Refresh
              </button>
              <Link
                href="/bridge"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1.5 text-xs text-[#ccff00] transition hover:bg-[#ccff00]/10"
              >
                Mint with ETH →
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
