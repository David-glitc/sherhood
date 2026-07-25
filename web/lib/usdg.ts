/** Canonical USDG on Robinhood Chain — 6 decimals (Global Dollar / Paxos). */
export const USDG_DECIMALS = 6
export const USDG_UNIT = 10n ** BigInt(USDG_DECIMALS)

/**
 * Legacy note: early pots accidentally used 1e18 = $1. Live RH pots and
 * EntryRouter swaps use native 6-decimal USDG token units.
 */
export const PROTOCOL_USDG_SCALE = 10n ** 12n

/** Above this, an amount is almost certainly mistaken 18-dec (parseEther) input. */
export const USDG_TOKEN_AMOUNT_MAX = 10n ** 15n // $1e9 at 6 decimals — absurd for a basket

/** User $ input → on-chain USDG base units (6 decimals). */
export function parseUsdgInput(dollars: number): bigint {
  if (!Number.isFinite(dollars) || dollars <= 0) return 0n
  return BigInt(Math.round(dollars * 10 ** USDG_DECIMALS))
}

/**
 * Guard against inventing pots with parseEther / 18-dec amounts.
 * EntryRouter swaps return 6-dec USDG — mins in 18-dec make every ETH fund revert
 * (wallet shows Network Fee "--" / Confirm disabled).
 */
export function assertUsdgTokenAmount(amount: bigint, label = "USDG amount"): bigint {
  if (amount <= 0n) {
    throw new Error(`${label} must be greater than 0`)
  }
  if (amount >= USDG_TOKEN_AMOUNT_MAX) {
    throw new Error(
      `${label} looks like 18-decimal wei (${amount}). Use parseUsdgInput() — USDG is 6 decimals on Robinhood Chain.`
    )
  }
  return amount
}

/** Dollars → guarded 6-dec token units for factory / pot calls. */
export function usdgAmountFromDollars(dollars: number, label = "USDG amount"): bigint {
  return assertUsdgTokenAmount(parseUsdgInput(dollars), label)
}

/** Like usdgAmountFromDollars but allows 0 (entry fee / optional params). */
export function usdgAmountFromDollarsOrZero(dollars: number, label = "USDG amount"): bigint {
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new Error(`${label} must be a non-negative number`)
  }
  if (dollars === 0) return 0n
  return usdgAmountFromDollars(dollars, label)
}

/** True when an on-chain pot param is legacy 18-dec scale (unfundable via EntryRouter). */
export function isLegacyProtocolUsdg(amount: bigint): boolean {
  return amount >= 10n ** 15n
}

/** @deprecated alias — returns 6-dec token units (same as parseUsdgInput). */
export function dollarsToProtocol(dollars: number): bigint {
  return parseUsdgInput(dollars)
}

/** On-chain USDG amount → human display (auto-detects legacy 18-dec pots). */
export function fmtProtocolUsdg(amount: bigint): string {
  const divisor = isLegacyProtocolUsdg(amount) ? 1e18 : 10 ** USDG_DECIMALS
  return (Number(amount) / divisor).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

/** Token base units (6 dec) → human display */
export function fmtTokenUsdg(tokenAmount: bigint): string {
  return (Number(tokenAmount) / 10 ** USDG_DECIMALS).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

/** Scale helper: legacy 18-dec → 6-dec when needed. */
export function protocolToToken(amount: bigint): bigint {
  if (isLegacyProtocolUsdg(amount)) return amount / PROTOCOL_USDG_SCALE
  return amount
}
