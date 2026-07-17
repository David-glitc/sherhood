"use client"

import { useEffect, useState } from "react"

type Spot = { ethUsd: number; source: string }

export function EthUsdTicker({ className = "" }: { className?: string }) {
  const [spot, setSpot] = useState<Spot | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch("/api/prices/eth")
        if (!res.ok) return
        const data = (await res.json()) as Spot
        if (alive && data.ethUsd) setSpot(data)
      } catch {
        /* ignore */
      }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (!spot) {
    return (
      <span className={`text-[12px] font-medium text-white/30 ${className}`}>ETH —</span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-white/80 ${className}`}
      title={`Source: ${spot.source}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sherhood" />
      ETH{" "}
      <span className="text-white">
        $
        {spot.ethUsd.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    </span>
  )
}
