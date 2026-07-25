/** $SHERD — Sherhood token (luck + create waiver). */
export const SHRH_SYMBOL = "SHERD"
export const SHRH_NAME = "Sherhood"

/** Product tagline — collectible ownership framing. */
export const SHERHOOD_TAGLINE = "Collect stocks like gacha cards"

/** NFT / ownership unit name shown in product UI. */
export const SHERD_NAME = "Sherd"
export const SHERD_NAME_PLURAL = "Sherds"

/**
 * Internal ETH-mark target for luck (not shown in product copy).
 * On-chain amount is set after launch via setLuckToken.
 */
export const SHRH_LUCK_ETH_TARGET = 0.055
/** Display fallback until on-chain threshold is configured. */
export const SHRH_LUCK_BOOST_PCT = 25

/** Live $SHERD on Robinhood Chain. */
export const SHRH_ADDRESS = (process.env.NEXT_PUBLIC_SHRH_ADDRESS ||
  "0xe429dbb6b55532685C7eAE41DbF052934449aCc1") as `0x${string}`

export const SHRH_ENABLED =
  SHRH_ADDRESS !== "0x0000000000000000000000000000000000000000"

export const ORYNTH_URL = "https://orynth.dev"

/** Token is live — buy / hold perks may activate as protocol wiring lands. */
export const SHRH_LAUNCHED =
  process.env.NEXT_PUBLIC_SHRH_LAUNCHED === "0" ||
  process.env.NEXT_PUBLIC_SHRH_LAUNCHED === "false"
    ? false
    : true

export const SHRH_FLAP_URL =
  process.env.NEXT_PUBLIC_SHRH_FLAP_URL?.trim() ||
  `https://flap.sh/robinhood/${SHRH_ADDRESS}?lang=en`

export const SHRH_UNISWAP_BUY_URL = `https://app.uniswap.org/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${SHRH_ADDRESS}`

export const SHRH_UNISWAP_SELL_URL = `https://app.uniswap.org/swap?chain=robinhood&inputCurrency=${SHRH_ADDRESS}&outputCurrency=NATIVE`

/** Uniswap sell deep-link; optional exact $SHERD amount. */
export function shrhUniswapSellUrl(exactAmount?: string): string {
  const base = SHRH_UNISWAP_SELL_URL
  const amt = exactAmount?.trim()
  if (!amt || !Number.isFinite(Number(amt)) || Number(amt) <= 0) return base
  return `${base}&exactAmount=${encodeURIComponent(amt)}`
}

export const SHRH_DEXSCREENER_URL = `https://dexscreener.com/robinhood/${SHRH_ADDRESS}`

/** Explorer link for the official $SHERD contract. */
export function shrhExplorerUrl(
  explorerBase = process.env.NEXT_PUBLIC_EXPLORER_URL ||
    "https://robinhoodchain.blockscout.com"
): string {
  return `${explorerBase.replace(/\/$/, "")}/token/${SHRH_ADDRESS}`
}

/** Community Telegram hub */
export const TELEGRAM_URL = "https://t.me/sherhoodhub"
export const TELEGRAM_HANDLE = "sherhoodhub"

/** X / Twitter */
export const X_URL = "https://x.com/sherhood_xyz"
export const X_HANDLE = "sherhood_xyz"

/**
 * OpenSea collection + per-Sherd deep links (Robinhood Chain).
 * Collection slug: /collection/sherds
 * Prefer NEXT_PUBLIC_OPENSEA_URL for the collection; token links use PotCard address.
 */
export const OPENSEA_COLLECTION_SLUG = "sherds"

export const OPENSEA_COLLECTION_URL =
  process.env.NEXT_PUBLIC_OPENSEA_URL?.trim() ||
  `https://opensea.io/collection/${OPENSEA_COLLECTION_SLUG}`

/** PotCard contract on Robinhood (OpenSea item path). */
export const OPENSEA_CHAIN_SLUG = "robinhood"

export function openseaTokenUrl(
  tokenId: string | number | bigint,
  contract = process.env.NEXT_PUBLIC_POT_CARD_ADDRESS ||
    "0x646F4Dcb5f863bC9650C743556C478d8eD640773"
): string {
  const id = String(tokenId)
  const addr = contract.toLowerCase()
  return `https://opensea.io/item/${OPENSEA_CHAIN_SLUG}/${addr}/${id}`
}
