"use client"

export interface Round {
  targetToken: `0x${string}`
  swapFee: number
  entryFee: bigint
  maxEntries: bigint
  duration: bigint
  feePercent: bigint
  maxWinners: bigint
  state: number
  totalEntries: bigint
  totalUSDG: bigint
  tokenAmount: bigint
  startTime: bigint
  requestId: bigint
}

export const ROUND_STATES = ["Open", "Closed", "Resolved", "Bought", "Complete"] as const

export function parseRound(data: unknown): Round | null {
  if (!data || !Array.isArray(data)) return null
  return {
    targetToken: data[0] as `0x${string}`,
    swapFee: Number(data[1]),
    entryFee: data[2] as bigint,
    maxEntries: data[3] as bigint,
    duration: data[4] as bigint,
    feePercent: data[5] as bigint,
    maxWinners: data[6] as bigint,
    state: Number(data[7]),
    totalEntries: data[8] as bigint,
    totalUSDG: data[9] as bigint,
    tokenAmount: data[10] as bigint,
    startTime: data[11] as bigint,
    requestId: data[12] as bigint,
  }
}
