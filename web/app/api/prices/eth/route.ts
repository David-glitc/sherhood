import { NextResponse } from "next/server"

export const revalidate = 30

type Spot = {
  ethUsd: number
  changePct24h: number | null
  source: string
  updatedAt: string
}

async function fromBinance24h(): Promise<Spot> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT",
    { next: { revalidate: 30 } }
  )
  if (!res.ok) throw new Error("binance24h")
  const json = (await res.json()) as {
    lastPrice: string
    priceChangePercent: string
  }
  return {
    ethUsd: Number(json.lastPrice),
    changePct24h: Number(json.priceChangePercent),
    source: "binance",
    updatedAt: new Date().toISOString(),
  }
}

async function fromCoinbaseSpot(): Promise<Spot> {
  const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", {
    next: { revalidate: 30 },
  })
  if (!res.ok) throw new Error("coinbase")
  const json = (await res.json()) as { data: { amount: string } }
  return {
    ethUsd: Number(json.data.amount),
    changePct24h: null,
    source: "coinbase",
    updatedAt: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const spot = await fromBinance24h().catch(() => fromCoinbaseSpot())
    return NextResponse.json(spot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    })
  } catch {
    return NextResponse.json({ error: "price unavailable" }, { status: 502 })
  }
}
