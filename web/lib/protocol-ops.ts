/** Protocol / ops wallets excluded from public leaderboards. */
export const PROTOCOL_OPS_WALLETS = new Set(
  [
    // Deployer / factory owner / Sherhood ops
    "0x5F90bc2dC3d0aDC7EfE91cE5667d5AF00ee75AA1",
    // Protocol fee wallet
    "0xc24f7118f55d0643a82a1594cbcbb7484011a251",
    // TreasuryDirect
    "0x62cbf96cE2eDbc9218135385B009bF596F51325C",
  ].map((a) => a.toLowerCase())
)

/** Display names reserved for protocol — hide from public boards even if XP scored. */
export const PROTOCOL_OPS_NAMES = new Set(
  ["sherhood", "sherdhood", "sherwood", "protocol", "deployer", "ops"].map((n) =>
    n.toLowerCase()
  )
)

export function isProtocolOpsWallet(address: string | undefined | null): boolean {
  if (!address) return false
  return PROTOCOL_OPS_WALLETS.has(address.toLowerCase())
}

export function isProtocolOpsName(name: string | undefined | null): boolean {
  if (!name?.trim()) return false
  const n = name.trim().toLowerCase()
  if (PROTOCOL_OPS_NAMES.has(n)) return true
  return n.startsWith("sherhood") || n.startsWith("sherdhood")
}
