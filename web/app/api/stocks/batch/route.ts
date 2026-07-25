import { NextResponse } from "next/server"
import { stockBySymbol } from "@/lib/basket-stocks"

export const revalidate = 120

type Quote = { symbol: string; price: number; changePct: number }

async function fetchYahoo(symbol: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 120 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number }
          timestamp?: number[]
          indicators?: { quote?: Array<{ close?: (number | null)[] }> }
        }>
      }
    }
    const result = json.chart?.result?.[0]
    if (!result) return null
    const closes = result.indicators?.quote?.[0]?.close ?? []
    let last = result.meta?.regularMarketPrice
    if (last == null || !Number.isFinite(last)) {
      for (let i = closes.length - 1; i >= 0; i--) {
        if (closes[i] != null && Number.isFinite(closes[i]!)) {
          last = closes[i]!
          break
        }
      }
    }
    if (last == null || !Number.isFinite(last) || last <= 0) return null
    const prev = result.meta?.previousClose ?? result.meta?.chartPreviousClose ?? last
    const changePct = prev ? ((last - prev) / prev) * 100 : 0
    return { symbol, price: last, changePct }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("symbols") || ""
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => stockBySymbol(s))
    .slice(0, 25)

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] })
  }

  const quotes = (await Promise.all(symbols.map(fetchYahoo))).filter(
    (q): q is Quote => q != null
  )

  return NextResponse.json(
    { quotes, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
  )
}
