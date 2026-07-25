import { NextResponse } from "next/server"
import { SITE_URL } from "@/lib/seo"
import { SHERD_NAME_PLURAL, SHERHOOD_TAGLINE } from "@/lib/protocol"

/**
 * Collection-level metadata for OpenSea / EIP-7572 style `contractURI`.
 * Point PotCard.setContractURI to https://sherhood.xyz/api/collection
 */
export async function GET() {
  const metadata = {
    name: `Sherhood ${SHERD_NAME_PLURAL}`,
    description: `${SHERHOOD_TAGLINE}. Fractional stock-basket ownership ${SHERD_NAME_PLURAL} on Robinhood Chain. Mystery until reveal — rarity tracks your ownership share (Legendary ≥40%, Epic ≥20%, Rare ≥8%). Claim real RH stock tokens. Experimental software; read the terms before you trade.`,
    image: `${SITE_URL}/logo-mark-512.png`,
    banner_image: `${SITE_URL}/brand/sherhood-banner.jpg`,
    featured_image: `${SITE_URL}/brand/sherhood-banner.jpg`,
    external_link: `${SITE_URL}/inventory`,
    collaborative: false,
    seller_fee_basis_points: 250,
    fee_recipient:
      process.env.NEXT_PUBLIC_TREASURY_FEE_WALLET ||
      "0xc24f7118f55d0643a82a1594cbcbb7484011a251",
  }

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
