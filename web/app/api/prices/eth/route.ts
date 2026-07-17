import { NextResponse } from "next/server"

export const revalidate = 30

type Spot = { ethUsd: number; source: string; updatedAt: string }

async function fromCoinbase(): Promise<Spot> {
  const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", {
    next: { revalidate: 30 },
  })
  if (!res.ok) throw new Error("coinbase")
  const json = (await res.json()) as { data: { amount: string } }
  return {
    ethUsd: Number(json.data.amount),
    source: "coinbase",
    updatedAt: new Date().toISOString(),
  }
}

async function fromBinance(): Promise<Spot> {
  const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", {
    next: { revalidate: 30 },
  })
  if (!res.ok) throw new Error("binance")
  const json = (await res.json()) as { price: string }
  return {
    ethUsd: Number(json.price),
    source: "binance",
    updatedAt: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const spot = await fromCoinbase().catch(() => fromBinance())
    return NextResponse.json(spot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    })
  } catch {
    return NextResponse.json({ error: "price unavailable" }, { status: 502 })
  }
}
