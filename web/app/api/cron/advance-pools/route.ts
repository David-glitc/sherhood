import { NextResponse } from "next/server"
import { advanceAllReadyPots } from "@/lib/advance-pool"

export const dynamic = "force-dynamic"
export const maxDuration = 120

function authorized(request: Request): boolean {
  // Dedicated cron secret only. The Telegram bot token is deliberately NOT accepted here — it
  // is shared with the bot/webhook infra and must not authorize on-chain spends. Header-only,
  // since query-string secrets leak via logs, referrers, and proxies.
  const secret = process.env.CRON_SECRET || process.env.TELEGRAM_CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
}

/** Cron: seal → buy → reveal any ready pools. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const out = await advanceAllReadyPots(40)
    return NextResponse.json({ ok: true, ...out })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "advance failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
