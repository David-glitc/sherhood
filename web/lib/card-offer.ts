import { POT_CARD_ADDRESS } from "@/lib/contracts"
import { ROBINHOOD_CHAIN_ID } from "@/lib/chain"

export type SignedCardOffer = {
  tokenId: string
  seller: string
  buyer: string
  amountUsdg: string
  nonce: string
  /** Optional; defaults to live PotCard + RH chain. */
  card?: string
  chainId?: number
}

/** Canonical signed text for off-chain Sherd offers (listed or unlisted). */
export function cardOfferMessage(offer: SignedCardOffer): string {
  const card = (offer.card ?? POT_CARD_ADDRESS).toLowerCase()
  const chainId = offer.chainId ?? ROBINHOOD_CHAIN_ID
  return [
    "Sherhood card offer",
    `Chain: ${chainId}`,
    `Card: ${card}`,
    `Token: ${offer.tokenId}`,
    `Seller: ${offer.seller.toLowerCase()}`,
    `Buyer: ${offer.buyer.toLowerCase()}`,
    `Amount USDG: ${offer.amountUsdg}`,
    `Nonce: ${offer.nonce}`,
  ].join("\n")
}
