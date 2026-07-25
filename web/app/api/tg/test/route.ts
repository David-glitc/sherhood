import { NextResponse } from "next/server"
import { sendTelegramMessage, tgConfigured } from "@/lib/tg"

export const dynamic = "force-dynamic"

function authorized(request: Request): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false
  return request.headers.get("authorization") === `Bearer ${token}`
}

/** Smoke-test: POST with Bearer TELEGRAM_BOT_TOKEN + optional { text }. */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!tgConfigured()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required" },
      { status: 503 }
    )
  }

  let text =
    "<b>Sherhood</b> test ping — bot is wired."
  try {
    const body = (await request.json()) as { text?: string }
    if (body?.text?.trim()) text = body.text.trim()
  } catch {
    /* no body */
  }

  const result = await sendTelegramMessage(text)
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
