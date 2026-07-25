import type { XpEvent } from "@/lib/xp"

/** Stable dedupe key — XP totals must be deterministic from the same event set. */
export function xpEventId(e: Pick<XpEvent, "wallet" | "kind" | "at" | "pot" | "tokenId">): string {
  return [
    e.wallet.toLowerCase(),
    e.kind,
    String(e.at),
    (e.pot ?? "").toLowerCase(),
    e.tokenId ?? "",
  ].join("|")
}

export function mergeXpEvents(a: XpEvent[], b: XpEvent[]): XpEvent[] {
  const map = new Map<string, XpEvent>()
  for (const e of [...a, ...b]) {
    const normalized: XpEvent = {
      ...e,
      wallet: e.wallet.toLowerCase(),
    }
    map.set(xpEventId(normalized), normalized)
  }
  return Array.from(map.values()).sort((x, y) => x.at - y.at || x.kind.localeCompare(y.kind))
}
