import { NextResponse } from "next/server"

const SITE = "https://sherhood.xyz"

/**
 * Collection-level metadata for OpenSea / EIP-7572 style `contractURI`.
 * Point PotCard.setContractURI to https://sherhood.xyz/api/collection
 */
export async function GET() {
  const metadata = {
    name: "Sherhood Cards",
    description:
      "Fractional stock-basket ownership cards on Robinhood Chain. Mystery until reveal — then claim your share of real RH stock tokens. Experimental software; read the terms before you trade.",
    image: `${SITE}/logo-mark-512.png`,
    banner_image: `${SITE}/og-image.png`,
    external_link: SITE,
    seller_fee_basis_points: 250,
    fee_recipient:
      process.env.NEXT_PUBLIC_TREASURY_FEE_WALLET ||
      "0xc24f7118f55d0643a82a1594cbcbb7484011a251",
  }

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
