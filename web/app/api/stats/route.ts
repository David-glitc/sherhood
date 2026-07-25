import { NextResponse } from "next/server"
import { loadProtocolStats } from "@/lib/protocol-stats-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await loadProtocolStats()
  if (!data) {
    return NextResponse.json({ error: "stats unavailable" }, { status: 502 })
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
