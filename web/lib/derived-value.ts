/**
 * Trustless share of a basket (1e18 = 100%).
 * Matches Pot.derivedShare once redeployed; computable client-side today.
 */
export function computeDerivedShare(params: {
  depositAmount: bigint
  totalDeposited: bigint
  ownershipWeight: bigint
  revealed: boolean
  claimed: boolean
}): bigint {
  if (params.claimed) return 0n
  if (params.revealed) return params.ownershipWeight
  if (params.totalDeposited === 0n) return 0n
  return (params.depositAmount * 10n ** 18n) / params.totalDeposited
}

/** Human percent string, e.g. "3.80". */
export function shareToPct(share: bigint, digits = 2): string {
  const pct = Number(share) / 1e16
  return pct.toFixed(digits)
}
