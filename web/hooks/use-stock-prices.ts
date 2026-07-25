"use client"

import { useEffect, useMemo, useState } from "react"

export type StockQuote = {
  symbol: string
  price: number
  changePct: number
}

/** Batch-load live Yahoo quotes for stock symbols. */
export function useStockPrices(symbols: string[]) {
  const key = useMemo(
    () =>
      Array.from(new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean))).sort().join(","),
    [symbols]
  )

  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!key) {
      setQuotes({})
      return
    }
    let cancelled = false

    const load = (isFirst: boolean) => {
      if (isFirst) setLoading(true)
      fetch(`/api/stocks/batch?symbols=${encodeURIComponent(key)}`)
        .then((r) => (r.ok ? r.json() : { quotes: [] }))
        .then((json: { quotes?: StockQuote[] }) => {
          if (cancelled) return
          const next: Record<string, StockQuote> = {}
          for (const q of json.quotes ?? []) {
            if (q.symbol && q.price > 0) next[q.symbol.toUpperCase()] = q
          }
          setQuotes(next)
        })
        .catch(() => {
          if (!cancelled && isFirst) setQuotes({})
        })
        .finally(() => {
          if (!cancelled && isFirst) setLoading(false)
        })
    }

    load(true)
    // Live mark / PnL: refresh quotes so profile numbers track price moves.
    const id = window.setInterval(() => load(false), 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [key])

  const priceOf = (symbol: string) => quotes[symbol.toUpperCase()]?.price ?? 0

  return { quotes, loading, priceOf }
}
