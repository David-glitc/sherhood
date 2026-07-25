/**
 * Display names for Sherd pools (pots).
 * Named overrides first; otherwise deterministic Sherwood-themed names from address.
 */

const NAMED_POOLS: Record<string, string> = {
  // filled after create — see registerNamedPool / env below
}

/** Register a human name for a pot address (lowercase). */
export function registerNamedPool(address: string, name: string) {
  NAMED_POOLS[address.toLowerCase()] = name.trim()
}

/** Hydrate many names (e.g. from /api/pools/names). */
export function registerNamedPools(map: Record<string, string>) {
  for (const [addr, name] of Object.entries(map)) {
    if (addr && name) NAMED_POOLS[addr.toLowerCase()] = name.trim()
  }
}

const ADJECTIVES = [
  "Neon",
  "Emerald",
  "Midnight",
  "Golden",
  "Lucky",
  "Wild",
  "Phantom",
  "Solar",
  "Ember",
  "Frost",
  "Rogue",
  "Cosmic",
  "Silent",
  "Blazing",
  "Iron",
  "Velvet",
  "Storm",
  "Crimson",
  "Static",
  "Shadow",
  "Turbo",
  "Amber",
  "Nova",
  "Feral",
  "Gilded",
  "Hollow",
  "Mystic",
  "Rapid",
  "Sly",
  "Vivid",
  "Noble",
  "Quantum",
] as const

const NOUNS = [
  "Arrow",
  "Quiver",
  "Longbow",
  "Bullseye",
  "Vault",
  "Hood",
  "Stag",
  "Willow",
  "Outlaw",
  "Bandit",
  "Fletcher",
  "Marksman",
  "Forest",
  "Loot",
  "Bounty",
  "Thicket",
  "Talon",
  "Saddle",
  "Lantern",
  "Falcon",
  "Cache",
  "Glade",
  "Ranger",
  "Draw",
  "Volley",
  "Prize",
  "Oak",
  "Fox",
  "Raven",
  "Grove",
  "Crest",
  "Shire",
] as const

/** Seed known featured pools. */
const FEATURED_POOLS: Record<string, string> = {
  "0x80d61011e00247c988c73b07fc5cded54f075910": "Orynth #1",
  "0x91aa13f1f6e19930fd60f1a87211b0c6d7f3914b": "Crimson Talon",
  "0xcd5efccf00e9fd9839919a9ad478621649ffced4": "Stock Gacha",
}

function featuredFromEnv(): Record<string, string> {
  const addr = process.env.NEXT_PUBLIC_ORYNTH_POOL_1
  if (!addr) return {}
  return { [addr.toLowerCase()]: "Orynth #1" }
}

/** Random Sherwood-style name for the create form. */
export function randomBasketName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]!
  const b = NOUNS[Math.floor(Math.random() * NOUNS.length)]!
  return `${a} ${b}`
}

/** "Orynth #1" or "Neon Quiver" — stable per address. */
export function basketName(address: string): string {
  const key = address.toLowerCase()
  const named =
    NAMED_POOLS[key] ||
    FEATURED_POOLS[key] ||
    featuredFromEnv()[key]
  if (named) return named

  const hex = key.replace(/^0x/, "")
  const a = parseInt(hex.slice(0, 8), 16)
  const b = parseInt(hex.slice(8, 16), 16)
  return `${ADJECTIVES[a % ADJECTIVES.length]} ${NOUNS[b % NOUNS.length]}`
}

/** Alias — preferred product noun. */
export const poolName = basketName

/** Two-letter monogram for compact UI slots. */
export function basketMonogram(address: string): string {
  const name = basketName(address)
  const parts = name.replace(/#/g, "").trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export const poolMonogram = basketMonogram
