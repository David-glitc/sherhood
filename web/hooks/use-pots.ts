// Pure helpers/types shared by client components and API routes — must stay server-safe.
import { BASKET_STOCKS, stockByAddress } from "@/lib/basket-stocks"

export const POT_STATUSES = ["Funding", "Closed", "Purchased", "Revealed", "Cancelled"] as const

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
  const pct = (Number(weight) / 1e18) * 100
  if (!Number.isFinite(pct)) return "0"
  // Prefer whole numbers (100%) over 100.0000 / 100.00
  const nearest = Math.round(pct)
  if (Math.abs(pct - nearest) < 0.005) return String(nearest)
  return pct.toFixed(2).replace(/\.?0+$/, "")
}

/**
 * Rarity from ownership share (1e18 = 100%). Product rule: bigger claim → higher rarity.
 * Legendary ≥40% · Epic ≥20% · Rare ≥8% · else Common.
 * (Luck multipliers still reshape weights; rarity labels the resulting share.)
 */
export function rarityIndexFromOwnership(ownershipWeight: bigint): number {
  if (ownershipWeight >= 400_000_000_000_000_000n) return 4 // Legendary
  if (ownershipWeight >= 200_000_000_000_000_000n) return 3 // Epic
  if (ownershipWeight >= 80_000_000_000_000_000n) return 2 // Rare
  return 1 // Common
}

/** Prefer share-based rarity for revealed Sherds (fixes legacy multiplier-only reveals). */
export function effectiveRarityIndex(
  revealed: boolean,
  onChainRarity: number,
  ownershipWeight: bigint
): number {
  if (!revealed) return 0
  // On-chain rarity from RevealEngine (_rarityFromOwnership) — what OpenSea reads via metadata.
  if (onChainRarity >= 1 && onChainRarity <= 4) return onChainRarity
  return rarityIndexFromOwnership(ownershipWeight)
}

export function fmtUsdg(value: bigint): string {
  // RH USDG is 6 decimals. Legacy pots used 1e18 = $1 — detect and display both.
  return usdgToDollars(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

/** Convert on-chain USDG amount to dollars (handles 6-dec RH + legacy 18-dec). */
export function usdgToDollars(value: bigint): number {
  if (value === 0n) return 0
  const divisor = value >= 10n ** 15n ? 1e18 : 1e6
  return Number(value) / divisor
}

/** Human units for RH stock tokens (always 18 decimals). */
export function stockAmountToNumber(amountWei: bigint): number {
  return Number(amountWei) / 1e18
}

/** Pots created with parseEther mins cannot accept EntryRouter ETH deposits. */
export function potBlocksEthDeposit(minDeposit: bigint): boolean {
  return minDeposit >= 10n ** 15n
}

export function fmtTokenAmount(value: bigint): string {
  return (Number(value) / 1e18).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })
}

/** True while the pot still accepts deposits (Funding + before deadline + under goal). */
export function isAcceptingDeposits(
  status: number,
  deadline: bigint,
  totalDeposited: bigint,
  fundingGoal: bigint
): boolean {
  if (status !== 0) return false
  if (totalDeposited >= fundingGoal) return false
  return Math.floor(Date.now() / 1000) < Number(deadline)
}

/** Funding window ended (deadline or goal) but on-chain status may still be Funding until close(). */
export function isReadyToEndPool(
  status: number,
  deadline: bigint,
  totalDeposited: bigint,
  fundingGoal: bigint,
  participantCount: bigint
): boolean {
  if (status !== 0 || participantCount === 0n) return false
  const now = Math.floor(Date.now() / 1000)
  return totalDeposited >= fundingGoal || now >= Number(deadline)
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
