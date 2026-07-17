/** Canonical USDG on Robinhood Chain — 6 decimals (Global Dollar / Paxos). */
export const USDG_DECIMALS = 6
export const USDG_UNIT = 10n ** BigInt(USDG_DECIMALS)

/**
 * Pot contracts store USDG amounts in 18-decimal protocol units (1e18 = $1)
 * while IERC20 USDG uses 6 decimals on RH mainnet.
 */
export const PROTOCOL_USDG_SCALE = 10n ** 12n

export function parseUsdgInput(dollars: number): bigint {
  if (!Number.isFinite(dollars) || dollars <= 0) return 0n
  return BigInt(Math.round(dollars * 10 ** USDG_DECIMALS))
}

/** Protocol storage (1e18 = $1) → human display */
export function fmtProtocolUsdg(protocolAmount: bigint): string {
  return (Number(protocolAmount) / 1e18).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

/** Token base units (6 dec) → human display */
export function fmtTokenUsdg(tokenAmount: bigint): string {
  return (Number(tokenAmount) / 10 ** USDG_DECIMALS).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

/** User input ($) → protocol units expected by Pot contract */
export function dollarsToProtocol(dollars: number): bigint {
  return BigInt(Math.round(dollars * 1e18))
}

/** Protocol units → token units for approve/transfer */
export function protocolToToken(protocolAmount: bigint): bigint {
  return protocolAmount / PROTOCOL_USDG_SCALE
}
