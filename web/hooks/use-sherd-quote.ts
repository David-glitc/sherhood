"use client"

import { useCallback, useEffect, useState } from "react"

export type SherdQuote = {
  priceUsd: number
  priceNative: number
  updatedAt: number
}

/** Dexscreener quote for $SHERD (ETH + USD). Cached ~30s. */
export function useSherdQuote() {
  const [quote, setQuote] = useState<SherdQuote | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${process.env.NEXT_PUBLIC_SHRH_ADDRESS || "0xe429dbb6b55532685C7eAE41DbF052934449aCc1"}`
      )
      if (!res.ok) return
      const json = (await res.json()) as {
        pairs?: { priceUsd?: string; priceNative?: string; quoteToken?: { symbol?: string }; liquidity?: { usd?: number } }[]
      }
      const pairs = json.pairs ?? []
      const ethPair =
        pairs.find((p) => p.quoteToken?.symbol === "ETH" && (p.liquidity?.usd ?? 0) > 0) ||
        pairs.find((p) => p.quoteToken?.symbol === "ETH") ||
        pairs[0]
      if (!ethPair?.priceUsd) return
      setQuote({
        priceUsd: Number(ethPair.priceUsd),
        priceNative: Number(ethPair.priceNative || 0),
        updatedAt: Date.now(),
      })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, 30_000)
    return () => window.clearInterval(id)
  }, [load])

  return quote
}
