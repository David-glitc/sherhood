/** XP scoring rules — derived from on-chain actions (not a transferable token). */

export type XpActionKind =
  | "deposit"
  | "create"
  | "reveal"
  | "claim"
  | "buy"
  | "sell"
  | "early_exit"

export const XP_REWARDS: Record<XpActionKind, number> = {
  deposit: 100,
  create: 250,
  reveal: 50,
  claim: 150,
  buy: 75,
  sell: 75,
  early_exit: 25,
}

export type XpEvent = {
  kind: XpActionKind
  wallet: string
  at: number // unix seconds
  pot?: string
  tokenId?: string
  xp: number
}

export type WalletScore = {
  wallet: string
  xp: number
  actions: number
  streak: number
  lastDay: string // YYYY-MM-DD UTC
}

function dayKey(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

function prevDay(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** +10% per consecutive prior day with activity, capped at +50%. */
export function streakMultiplier(streakDays: number): number {
  const bonusSteps = Math.min(5, Math.max(0, streakDays - 1))
  return 1 + bonusSteps * 0.1
}

/**
 * Collapse raw events into per-wallet totals with streak-aware XP.
 * Events should be sorted ascending by `at`.
 */
export function scoreWallets(events: XpEvent[]): WalletScore[] {
  const byWallet = new Map<string, XpEvent[]>()
  for (const e of events) {
    const w = e.wallet.toLowerCase()
    const list = byWallet.get(w) ?? []
    list.push(e)
    byWallet.set(w, list)
  }

  const scores: WalletScore[] = []
  for (const [wallet, list] of byWallet) {
    list.sort((a, b) => a.at - b.at)

    // Build ordered unique active days
    const days: string[] = []
    for (const e of list) {
      const d = dayKey(e.at)
      if (days[days.length - 1] !== d) days.push(d)
    }

    // Streak = longest trailing consecutive run ending at the most recent day
    let streak = 1
    for (let i = days.length - 1; i > 0; i--) {
      if (days[i - 1] === prevDay(days[i])) streak += 1
      else break
    }
    if (days.length === 0) streak = 0

    // Day → streak length as of that day (from start of consecutive run)
    const dayStreak = new Map<string, number>()
    let run = 0
    for (let i = 0; i < days.length; i++) {
      if (i === 0 || days[i - 1] === prevDay(days[i])) run += 1
      else run = 1
      dayStreak.set(days[i], run)
    }

    let xp = 0
    for (const e of list) {
      const s = dayStreak.get(dayKey(e.at)) ?? 1
      xp += Math.round(e.xp * streakMultiplier(s))
    }

    scores.push({
      wallet,
      xp,
      actions: list.length,
      streak,
      lastDay: days[days.length - 1] ?? "",
    })
  }

  return scores.sort((a, b) => b.xp - a.xp)
}
