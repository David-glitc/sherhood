import {
  answerCallbackQuery,
  editTelegramMessage,
  sendTelegramMessage,
  tgEscape,
  type InlineKeyboard,
} from "@/lib/tg"
import { SITE_URL } from "@/lib/seo"
import { OPENSEA_COLLECTION_URL, TELEGRAM_URL, X_URL } from "@/lib/protocol"

const APP = SITE_URL.replace(/\/$/, "")

type TgChat = {
  id: number
  type: string
  title?: string
  username?: string
  first_name?: string
}

type TgMessage = {
  message_id: number
  chat: TgChat
  text?: string
}

type TgCallbackQuery = {
  id: string
  data?: string
  message?: TgMessage
  from?: { id: number; first_name?: string; username?: string }
}

type TgUpdate = {
  update_id: number
  message?: TgMessage
  callback_query?: TgCallbackQuery
}

function parseCommand(text: string): string | null {
  const match = text.trim().match(/^\/([a-z0-9_]+)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i)
  return match ? match[1]!.toLowerCase() : null
}

function mainMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "🟢 Pools", url: `${APP}/app` },
      { text: "✨ Create", url: `${APP}/create` },
    ],
    [
      { text: "🃏 Sherds", url: `${APP}/inventory` },
      { text: "↔ Trade", url: `${APP}/marketplace` },
    ],
    [
      { text: "📊 Live stats", callback_data: "cmd:stats" },
      { text: "🆔 Chat id", callback_data: "cmd:whoami" },
    ],
    [
      { text: "Community", url: TELEGRAM_URL },
      { text: "X", url: X_URL },
      { text: "OpenSea", url: OPENSEA_COLLECTION_URL },
    ],
  ]
}

function statsKeyboard(): InlineKeyboard {
  return [
    [
      { text: "🔄 Refresh", callback_data: "cmd:stats" },
      { text: "☰ Menu", callback_data: "cmd:menu" },
    ],
    [
      { text: "Open app", url: `${APP}/app` },
      { text: "Community", url: TELEGRAM_URL },
    ],
  ]
}

function whoamiKeyboard(): InlineKeyboard {
  return [
    [
      { text: "☰ Menu", callback_data: "cmd:menu" },
      { text: "Open app", url: `${APP}/app` },
    ],
  ]
}

async function reply(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboard
) {
  return sendTelegramMessage(text, { chatId: String(chatId), replyMarkup })
}

async function editOrReply(
  chatId: number,
  messageId: number | undefined,
  text: string,
  replyMarkup?: InlineKeyboard
) {
  if (messageId != null) {
    const edited = await editTelegramMessage(chatId, messageId, text, { replyMarkup })
    if (edited.ok) return edited
  }
  return reply(chatId, text, replyMarkup)
}

function welcomeText(): string {
  return [
    `<b>Sherhood</b>`,
    `<i>Collect stocks like gacha cards</i>`,
    ``,
    `Pool alerts, funding, reveals, and trades land in the broadcast channel.`,
    ``,
    `<b>Quick actions</b> below — or try:`,
    `/stats — live vault TVL + pools`,
    `/whoami — this chat id`,
    `/help — this menu`,
  ].join("\n")
}

async function buildStatsText(): Promise<string> {
  try {
    const res = await fetch(`${APP}/api/stats`, { cache: "no-store" })
    if (!res.ok) throw new Error(`stats ${res.status}`)
    const data = (await res.json()) as {
      pools?: { live?: number; total?: number; processing?: number; ended?: number }
      cards?: { active?: string }
      users?: { uniqueDepositors?: string }
      volume?: { fundingTvlFmt?: string; totalDepositedFmt?: string; lifetimeFeesFmt?: string }
      revenue?: { lifetimeFeesFmt?: string }
    }
    const tvl = data.volume?.fundingTvlFmt ?? "—"
    const deposited = data.volume?.totalDepositedFmt ?? "—"
    const fees = data.revenue?.lifetimeFeesFmt ?? data.volume?.lifetimeFeesFmt ?? "—"
    const live = data.pools?.live ?? "—"
    const total = data.pools?.total ?? "—"
    const cards = data.cards?.active ?? "—"
    const depositors = data.users?.uniqueDepositors ?? "—"
    return [
      `<b>Sherhood · live</b>`,
      ``,
      `Vault TVL   <code>$${tgEscape(String(tvl))}</code>`,
      `Lifetime    <code>$${tgEscape(String(fees))}</code> fees`,
      `Deposited   <code>$${tgEscape(String(deposited))}</code>`,
      `Live pools  <code>${tgEscape(String(live))}</code> / ${tgEscape(String(total))}`,
      `Sherds      <code>${tgEscape(String(cards))}</code>`,
      `Depositors  <code>${tgEscape(String(depositors))}</code>`,
      ``,
      `<i>Updated just now</i>`,
    ].join("\n")
  } catch {
    return [
      `<b>Sherhood · live</b>`,
      ``,
      `Couldn’t reach stats right now.`,
      `Open the app or tap Refresh.`,
    ].join("\n")
  }
}

function whoamiText(chat: TgChat): string {
  const chatLabel =
    chat.title ||
    [chat.first_name].filter(Boolean).join(" ") ||
    chat.username ||
    "chat"
  return [
    `<b>This chat</b>`,
    `${tgEscape(chatLabel)}`,
    ``,
    `type  <code>${tgEscape(chat.type)}</code>`,
    `id    <code>${chat.id}</code>`,
  ].join("\n")
}

async function dispatchCommand(
  cmd: string,
  chat: TgChat,
  messageId?: number
): Promise<void> {
  if (cmd === "start" || cmd === "help" || cmd === "menu") {
    await editOrReply(chat.id, messageId, welcomeText(), mainMenuKeyboard())
    return
  }

  if (cmd === "stats" || cmd === "live" || cmd === "pools") {
    const text = await buildStatsText()
    await editOrReply(chat.id, messageId, text, statsKeyboard())
    return
  }

  if (cmd === "whereami" || cmd === "whoami") {
    await editOrReply(chat.id, messageId, whoamiText(chat), whoamiKeyboard())
    return
  }

  // Unknown slash → soft nudge to menu
  await reply(
    chat.id,
    `Unknown command. Try /help`,
    [[{ text: "☰ Menu", callback_data: "cmd:menu" }]]
  )
}

/** Handle one Telegram update (webhook or long-poll). */
export async function handleTelegramUpdate(update: TgUpdate): Promise<void> {
  const cb = update.callback_query
  if (cb?.id) {
    const data = (cb.data || "").trim()
    const chat = cb.message?.chat
    if (!chat?.id) {
      await answerCallbackQuery(cb.id)
      return
    }
    const cmd = data.startsWith("cmd:") ? data.slice(4) : data
    await answerCallbackQuery(cb.id)
    await dispatchCommand(cmd, chat, cb.message?.message_id)
    return
  }

  const msg = update.message
  if (!msg?.text || !msg.chat?.id) return

  const cmd = parseCommand(msg.text)
  if (!cmd) {
    // Plain text in private chats → show menu once
    if (msg.chat.type === "private") {
      await reply(msg.chat.id, welcomeText(), mainMenuKeyboard())
    }
    return
  }

  await dispatchCommand(cmd, msg.chat)
}

export async function setTelegramWebhook(appUrl: string, secret?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false as const, error: "TELEGRAM_BOT_TOKEN not set" }

  const url = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`
  const body: Record<string, unknown> = {
    url,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  }
  if (secret) body.secret_token = secret

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as { ok?: boolean; description?: string }
  if (!json.ok) return { ok: false as const, error: json.description || "setWebhook failed" }
  return { ok: true as const, url }
}

let commandsSynced = false

export async function setTelegramCommands() {
  if (commandsSynced) return
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "start", description: "Menu + quick links" },
        { command: "help", description: "Menu + quick links" },
        { command: "stats", description: "Live vault TVL + pools" },
        { command: "whoami", description: "Show this chat id" },
      ],
    }),
  })
  if (res.ok) commandsSynced = true
}
