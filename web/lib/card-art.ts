export type CardRarityKey = "unrevealed" | "common" | "rare" | "epic" | "legendary"

export const RARITY_INDEX: Record<CardRarityKey, number> = {
  unrevealed: 0,
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

export const RARITY_FROM_INDEX: CardRarityKey[] = [
  "unrevealed",
  "common",
  "rare",
  "epic",
  "legendary",
]

export const CARD_ART: Record<
  CardRarityKey,
  {
    /** Fast web display (800×1200 WebP) */
    src: string
    /** Wallet / OpenSea metadata (1024×1536 JPEG) */
    metadataSrc: string
    label: string
    glow: string
    accent: string
  }
> = {
  unrevealed: {
    src: "/cards/mystery.webp",
    metadataSrc: "/cards/mystery.jpg",
    label: "Mystery",
    glow: "rgba(197, 247, 10, 0.45)",
    accent: "#ccff00",
  },
  common: {
    src: "/cards/common.webp",
    metadataSrc: "/cards/common.jpg",
    label: "Common",
    glow: "rgba(180, 190, 200, 0.35)",
    accent: "#b8c4d0",
  },
  rare: {
    src: "/cards/rare.webp",
    metadataSrc: "/cards/rare.jpg",
    label: "Rare",
    glow: "rgba(56, 189, 248, 0.5)",
    accent: "#38bdf8",
  },
  epic: {
    src: "/cards/epic.webp",
    metadataSrc: "/cards/epic.jpg",
    label: "Epic",
    glow: "rgba(167, 139, 250, 0.55)",
    accent: "#a78bfa",
  },
  legendary: {
    src: "/cards/legendary.webp",
    metadataSrc: "/cards/legendary.jpg",
    label: "Legendary",
    glow: "rgba(251, 191, 36, 0.65)",
    accent: "#fbbf24",
  },
}

export function rarityKeyFromIndex(index: number): CardRarityKey {
  return RARITY_FROM_INDEX[index] ?? "unrevealed"
}

export function cardArtForRarity(
  rarityIndex: number,
  revealed: boolean
): (typeof CARD_ART)[CardRarityKey] {
  if (!revealed) return CARD_ART.unrevealed
  return CARD_ART[rarityKeyFromIndex(rarityIndex)] ?? CARD_ART.common
}

/** Absolute image URL for token metadata / wallets */
export function cardImageUrl(rarityIndex: number, revealed: boolean): string {
  const key = !revealed ? "unrevealed" : rarityKeyFromIndex(rarityIndex)
  return `https://sherhood.xyz${CARD_ART[key].metadataSrc}`
}
