"use client"

export const POT_STATUSES = ["Funding", "Closed", "Purchased", "Revealed"] as const

export const RARITIES = ["Unrevealed", "Common", "Rare", "Epic", "Legendary"] as const

export interface PotView {
  address: `0x${string}`
  targetToken: `0x${string}`
  fundingGoal: bigint
  deadline: bigint
  minDeposit: bigint
  entryFee: bigint
  status: number
  totalDeposited: bigint
  participantCount: bigint
  assetAmount: bigint
  progressBps: bigint
}

export interface CardView {
  tokenId: bigint
  pot: `0x${string}`
  depositAmount: bigint
  ownershipWeight: bigint
  rarity: number
  revealed: boolean
}

export function ownershipPct(weight: bigint): string {
  return ((Number(weight) / 1e18) * 100).toFixed(4)
}

export function fmtUsdg(value: bigint): string {
  return (Number(value) / 1e18).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

export function deadlineLabel(deadline: bigint): string {
  const end = Number(deadline) * 1000
  const diff = end - Date.now()
  if (diff <= 0) return "Closed"
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  if (d > 0) return `${d}d ${h}h left`
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${m}m left`
}

const TOKEN_NAMES: Record<string, string> = {
  "0x309fc0dd9cf7fc77dc9c8ee3b68bfd06a7c226bc": "NVDA",
  "0x95b73c5780437ce92258f8074878287dfc8ed314": "AAPL",
  "0x62cbf96ce2edbc9218135385b009bf596f51325c": "GOOG",
}

export function tokenLabel(address: string): string {
  return TOKEN_NAMES[address.toLowerCase()] || `${address.slice(0, 6)}…${address.slice(-4)}`
}
