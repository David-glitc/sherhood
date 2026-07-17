/** $SHRH — luck bringer for reveal boost (launches next week). */
export const SHRH_SYMBOL = "SHRH"
export const SHRH_NAME = "Sherhood"

/**
 * Target hold for luck boost ≈ 0.055 ETH of $SHRH at launch price.
 * Absolute token amount is set on-chain after launch via setLuckToken.
 * UI uses this ETH target for copy until the token amount is known.
 */
export const SHRH_LUCK_ETH_TARGET = 0.055
/** Display fallback until on-chain threshold is configured. */
export const SHRH_LUCK_BOOST_PCT = 25

export const SHRH_ADDRESS = (process.env.NEXT_PUBLIC_SHRH_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`

export const SHRH_ENABLED =
  SHRH_ADDRESS !== "0x0000000000000000000000000000000000000000"

export const ORYNTH_URL = "https://orynth.dev"
export const SHRH_LAUNCHED = false

/** Community Telegram hub */
export const TELEGRAM_URL = "https://t.me/sherhoodhub"
export const TELEGRAM_HANDLE = "sherhoodhub"

/**
 * OpenSea collection URL once verified. Empty string hides the nav link.
 * Set NEXT_PUBLIC_OPENSEA_URL when the collection is live.
 */
export const OPENSEA_COLLECTION_URL =
  process.env.NEXT_PUBLIC_OPENSEA_URL?.trim() || ""
