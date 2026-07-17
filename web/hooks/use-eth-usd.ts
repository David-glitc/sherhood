"use client"

import { useEffect, useState } from "react"

/** Converts ETH amount to USD using live /api/prices/eth */
export function useEthUsd() {
  const [ethUsd, setEthUsd] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch("/api/prices/eth")
        if (!res.ok) return
        const data = (await res.json()) as { ethUsd: number }
        if (alive && data.ethUsd) setEthUsd(data.ethUsd)
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

  const usdOfEth = (ethAmount: number) =>
    ethUsd == null || !Number.isFinite(ethAmount) ? null : ethAmount * ethUsd

  return { ethUsd, usdOfEth }
}
