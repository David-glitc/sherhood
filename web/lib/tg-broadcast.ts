import { rhPublicClient } from "@/lib/rh-public-client"
import { fetchChainActivity } from "@/lib/onchain-activity"
import { getTgCursor, setTgCursor } from "@/lib/tg-cursor"
import { sendTelegramMessage, tgConfigured } from "@/lib/tg"
import { mongoConfigured } from "@/lib/mongo"

const LOOKBACK_DEFAULT = 2_000n
const MAX_MESSAGES_PER_RUN = 25
const MAX_SPAN = 3_000n

export type TgBroadcastResult = {
  ok: boolean
  error?: string
  bootstrapped?: boolean
  skipped?: boolean
  reason?: string
  from?: string
  to?: string
  latest?: string
  found?: number
  sent?: number
  results?: { kind: string; ok: boolean; error?: string }[]
  telegram?: { ok: boolean; error?: string }
}

/**
 * One chain-scan tick → Telegram posts. Shared by the long-poll worker
 * and the optional HTTP trigger (same pattern as Chessonchain: no Vercel cron).
 */
export async function runTgBroadcastTick(): Promise<TgBroadcastResult> {
  if (!tgConfigured()) {
    return {
      ok: false,
      error: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID",
    }
  }

  if (!mongoConfigured()) {
    return { ok: false, error: "MONGODB_URI required for broadcast cursor" }
  }

  const latest = await rhPublicClient.getBlockNumber()
  let from = await getTgCursor()

  if (from == null) {
    const lookback = BigInt(process.env.TELEGRAM_LOOKBACK_BLOCKS || LOOKBACK_DEFAULT.toString())
    from = latest > lookback ? latest - lookback : 0n
    await setTgCursor(from)
    const boot = await sendTelegramMessage(
      [
        `<b>Sherhood activity bot online</b>`,
        `Watching Robinhood Chain from block <code>${from.toString()}</code>.`,
        `Pools · funding · mints · reveals · trades · transfers`,
      ].join("\n")
    )
    return {
      ok: true,
      bootstrapped: true,
      from: from.toString(),
      latest: latest.toString(),
      telegram: boot,
    }
  }

  if (latest <= from) {
    return {
      ok: true,
      skipped: true,
      reason: "no new blocks",
      from: from.toString(),
      latest: latest.toString(),
    }
  }

  const to = latest - from > MAX_SPAN ? from + MAX_SPAN : latest
  const activities = await fetchChainActivity(from, to)
  const batch = activities.slice(0, MAX_MESSAGES_PER_RUN)

  const results: { kind: string; ok: boolean; error?: string }[] = []
  for (const item of batch) {
    const sent = await sendTelegramMessage(item.message)
    results.push({ kind: item.kind, ok: sent.ok, error: sent.error })
    await new Promise((r) => setTimeout(r, 80))
  }

  await setTgCursor(to)

  return {
    ok: true,
    from: from.toString(),
    to: to.toString(),
    latest: latest.toString(),
    found: activities.length,
    sent: batch.length,
    results,
  }
}
