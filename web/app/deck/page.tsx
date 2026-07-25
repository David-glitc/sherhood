import type { Metadata } from "next"
import { ProductDeck } from "@/components/deck/product-deck"
import { SHERHOOD_TAGLINE } from "@/lib/protocol"

export const metadata: Metadata = {
  title: "Deck — Sherhood",
  description: `${SHERHOOD_TAGLINE}. Product deck.`,
}

/** Full-viewport deck — back + slides only (covers site chrome). */
export default function DeckPage() {
  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <ProductDeck />
    </div>
  )
}
