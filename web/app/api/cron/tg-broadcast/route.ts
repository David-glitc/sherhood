import { NextResponse } from "next/server"
import { runTgBroadcastTick } from "@/lib/tg-broadcast"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** @deprecated Prefer /api/tg/broadcast + `pnpm tg:poll`. Kept as alias. */
function authorized(request: Request): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false
  const header = request.headers.get("authorization")
  if (header === `Bearer ${token}`) return true
  // legacy cron secret still accepted for existing external callers
  const legacy = process.env.CRON_SECRET || process.env.TELEGRAM_CRON_SECRET
  if (legacy && (header === `Bearer ${legacy}` || new URL(request.url).searchParams.get("secret") === legacy)) {
    return true
  }
  return false
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
