import { NextResponse } from "next/server"
import { stockBySymbol } from "@/lib/basket-stocks"

export const revalidate = 300

type ChartPoint = { t: number; c: number }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()
  if (!stockBySymbol(symbol)) {
    return NextResponse.json({ error: "unknown symbol" }, { status: 404 })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`yahoo ${res.status}`)
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; previousClose?: number }
          timestamp?: number[]
          indicators?: { quote?: Array<{ close?: (number | null)[] }> }
        }>
      }
    }
    const result = json.chart?.result?.[0]
    if (!result) throw new Error("no chart")
    const timestamps = result.timestamp ?? []
    const closes = result.indicators?.quote?.[0]?.close ?? []
    const series: ChartPoint[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i]
      if (c != null && Number.isFinite(c)) series.push({ t: timestamps[i], c })
    }
    if (series.length === 0) throw new Error("empty series")

    const spot = result.meta?.regularMarketPrice
    const lastClose = series[series.length - 1].c
    const price =
      typeof spot === "number" && Number.isFinite(spot) && spot > 0 ? spot : lastClose
    const prev = result.meta?.previousClose ?? series[0].c
    const changePct = prev ? ((price - prev) / prev) * 100 : 0

    return NextResponse.json(
      {
        symbol,
        price,
        changePct,
        series,
        updatedAt: new Date().toISOString(),
        source: "yahoo",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch {
    return NextResponse.json({ error: "chart unavailable" }, { status: 502 })
  }
}
