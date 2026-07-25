import { NextResponse } from "next/server"
import { runTgBroadcastTick } from "@/lib/tg-broadcast"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Manual / worker trigger for one broadcast tick.
 * Auth: Bearer TELEGRAM_BOT_TOKEN (same token the bot already has — not a public UI secret).
 */
function authorized(request: Request): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false
  const header = request.headers.get("authorization")
  return header === `Bearer ${token}`
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const result = await runTgBroadcastTick()
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "broadcast failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
