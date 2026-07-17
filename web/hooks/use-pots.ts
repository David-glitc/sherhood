"use client"

import { BASKET_STOCKS, stockByAddress } from "@/lib/basket-stocks"

export const POT_STATUSES = ["Funding", "Closed", "Purchased", "Revealed"] as const

export const RARITIES = ["Unrevealed", "Common", "Rare", "Epic", "Legendary"] as const

export type PotHolding = {
  token: `0x${string}`
  amount: bigint
  symbol: string
}

export interface PotView {
  address: `0x${string}`
  fundingGoal: bigint
  deadline: bigint
  minDeposit: bigint
  entryFee: bigint
  status: number
  totalDeposited: bigint
  participantCount: bigint
  progressBps: bigint
  holdings: PotHolding[]
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

export function fmtTokenAmount(value: bigint): string {
  return (Number(value) / 1e18).toLocaleString(undefined, {
    maximumFractionDigits: 4,
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

const TOKEN_NAMES: Record<string, string> = Object.fromEntries(
  BASKET_STOCKS.map((s) => [s.address.toLowerCase(), s.symbol])
)

export function tokenLabel(address: string): string {
  return TOKEN_NAMES[address.toLowerCase()] || `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function holdingsLabel(holdings: PotHolding[]): string {
  if (holdings.length === 0) return "Multi-stock basket"
  const syms = holdings.map((h) => h.symbol)
  if (syms.length <= 2) return syms.join(" + ")
  return `${syms.slice(0, 2).join(", ")} +${syms.length - 2}`
}

export function parseHoldings(
  tokens: `0x${string}`[] | undefined,
  amounts: bigint[] | undefined
): PotHolding[] {
  if (!tokens || !amounts || tokens.length !== amounts.length) return []
  return tokens.map((token, i) => ({
    token,
    amount: amounts[i],
    symbol: stockByAddress(token)?.symbol ?? tokenLabel(token),
  }))
}
