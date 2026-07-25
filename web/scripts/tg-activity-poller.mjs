#!/usr/bin/env node
/**
 * Long-running Sherhood activity poller (Chessonchain-style — no Vercel cron).
 *
 * Usage (from web/ with env loaded):
 *   TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… MONGODB_URI=… \
 *     node scripts/tg-activity-poller.mjs
 *
 * Or point at production:
 *   TELEGRAM_BOT_TOKEN=… SITE_URL=https://sherhood.xyz \
 *     node scripts/tg-activity-poller.mjs
 *
 * Polls /api/tg/broadcast every TELEGRAM_POLL_MS (default 45s).
 */

const token = process.env.TELEGRAM_BOT_TOKEN
const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
)
const intervalMs = Number(process.env.TELEGRAM_POLL_MS || 45_000)

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN required")
  process.exit(1)
}

async function tick() {
  const res = await fetch(`${base}/api/tg/broadcast`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  const stamp = new Date().toISOString()
  if (!res.ok) {
    console.error(stamp, "tick failed", res.status, json)
    return
  }
  if (json.skipped) {
    console.log(stamp, "idle", json.latest)
    return
  }
  console.log(
    stamp,
    json.bootstrapped ? "boot" : "sent",
    json.sent ?? 0,
    "of",
    json.found ?? 0,
    `blocks ${json.from ?? "?"}→${json.to ?? json.latest ?? "?"}`
  )
}

console.log(`Sherhood TG poller → ${base}/api/tg/broadcast every ${intervalMs}ms`)

for (;;) {
  try {
    await tick()
  } catch (e) {
    console.error(new Date().toISOString(), e)
  }
  await new Promise((r) => setTimeout(r, intervalMs))
}
