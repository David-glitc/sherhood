/** Instant Mint — deployer-sponsored solo micro-vault, self-funded + immediate reveal. */

export const INSTANT_MINT_AMOUNTS_USD = [1.5, 2] as const
export type InstantMintAmountUsd = (typeof INSTANT_MINT_AMOUNTS_USD)[number]

/** Default ticket size ($2). User skips the $5 community create fee. */
export const INSTANT_MINT_DEFAULT_USD: InstantMintAmountUsd = 2

/** Short funding window — pool is meant to fill in one deposit. */
export const INSTANT_MINT_DURATION_HOURS = 1

export function instantMintMessage(b: {
  minter: string
  amountUsd: number
  name: string
  issuedAt: number
}): string {
  return [
    "Sherhood instant mint",
    `minter: ${b.minter}`,
    `amountUsd: ${b.amountUsd}`,
    `name: ${b.name}`,
    `issuedAt: ${b.issuedAt}`,
  ].join("\n")
}

export function isInstantMintAmount(n: number): n is InstantMintAmountUsd {
  return (INSTANT_MINT_AMOUNTS_USD as readonly number[]).includes(n)
}
