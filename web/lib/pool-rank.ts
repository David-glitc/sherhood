/** Rank pools by activity volume for discovery / landing. */

export type PoolRankInput = {
  status: number
  totalDeposited: bigint
  participantCount: bigint
  progressBps: bigint
  deadline: bigint
}

/**
 * Higher = more prominent.
 * Funding first, then deposited volume, participants, progress; soft deadline boost.
 */
export function poolActivityScore(p: PoolRankInput): number {
  const deposited = Number(p.totalDeposited)
  const people = Number(p.participantCount)
  const progress = Number(p.progressBps) / 100 // 0–100

  // Status band: live funding >> in-flight >> revealed >> cancelled/empty
  const statusBand =
    p.status === 0 ? 1_000_000_000 : p.status === 1 || p.status === 2 ? 100_000_000 : p.status === 3 ? 10_000_000 : 0

  // Volume dominates within a band (USDG 6-dec units are fine as relative ranks)
  const volume = deposited
  const peopleScore = people * 1_000_000
  const progressScore = progress * 10_000

  // Prefer pools still open with time left
  const now = Math.floor(Date.now() / 1000)
  const deadline = Number(p.deadline)
  const timeBoost =
    p.status === 0 && deadline > now ? Math.min(50_000, Math.max(0, deadline - now)) : 0

  return statusBand + volume + peopleScore + progressScore + timeBoost
}

/** Sort addresses by activity (highest first). Stable for ties. */
export function sortPoolsByActivity<T extends PoolRankInput & { address: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const diff = poolActivityScore(b) - poolActivityScore(a)
    if (diff !== 0) return diff
    return a.address.localeCompare(b.address)
  })
}
