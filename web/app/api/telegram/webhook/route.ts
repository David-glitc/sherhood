import { NextResponse } from "next/server"
import { handleTelegramUpdate, setTelegramCommands } from "@/lib/tg-bot"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * Telegram webhook — commands + inline menus.
 * Chain broadcasts: `pnpm tg:poll` (or poke /stats which hits live API).
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token")
    if (header !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "bot not configured" }, { status: 503 })
  }

  let update: unknown
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  try {
    await setTelegramCommands()
    await handleTelegramUpdate(update as Parameters<typeof handleTelegramUpdate>[0])
  } catch (e) {
    console.error("[telegram] webhook handler", e)
  }

  return NextResponse.json({ ok: true })
}
