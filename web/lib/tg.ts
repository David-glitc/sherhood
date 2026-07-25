/** Telegram Bot API helpers for Sherhood activity broadcasts + bot replies. */

export type InlineButton =
  | { text: string; url: string }
  | { text: string; callback_data: string }

export type InlineKeyboard = InlineButton[][]

export function tgConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

export async function sendTelegramMessage(
  text: string,
  opts?: {
    disablePreview?: boolean
    chatId?: string
    replyMarkup?: InlineKeyboard
  }
): Promise<{ ok: boolean; error?: string; messageId?: number }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = opts?.chatId || process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set" }
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: opts?.disablePreview ?? true,
  }
  if (opts?.replyMarkup?.length) {
    body.reply_markup = { inline_keyboard: opts.replyMarkup }
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as {
    ok?: boolean
    description?: string
    result?: { message_id?: number }
  }
  if (!res.ok || !json.ok) {
    return { ok: false, error: json.description || `HTTP ${res.status}` }
  }
  return { ok: true, messageId: json.result?.message_id }
}

export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  opts?: { replyMarkup?: InlineKeyboard; disablePreview?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: opts?.disablePreview ?? true,
  }
  if (opts?.replyMarkup?.length) {
    body.reply_markup = { inline_keyboard: opts.replyMarkup }
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as { ok?: boolean; description?: string }
  if (!res.ok || !json.ok) {
    // "message is not modified" is fine
    if (json.description?.toLowerCase().includes("not modified")) return { ok: true }
    return { ok: false, error: json.description || `HTTP ${res.status}` }
  }
  return { ok: true }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  }).catch(() => undefined)
}

/** Escape HTML special chars for Telegram HTML mode. */
export function tgEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
