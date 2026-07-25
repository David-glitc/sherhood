import { NextResponse } from "next/server"
import { OPENSEA_COLLECTION_SLUG, OPENSEA_CHAIN_SLUG } from "@/lib/protocol"

export const dynamic = "force-dynamic"
export const revalidate = 0

export type OpenSeaListingRow = {
  tokenId: string
  priceEth: string
  priceRaw: string
  decimals: number
  currency: string
  orderHash: string
  maker: string
  permalink: string
  status: string
}

function apiKey(): string {
  return (
    process.env.OPENSEA_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_OPENSEA_API_KEY?.trim() ||
    ""
  )
}

/**
 * Active OpenSea Seaport listings for the Sherds collection.
 * OpenSea does NOT call CardMarketplace.list — separate venue (ETH / Seaport).
 */
export async function GET() {
  const key = apiKey()
  if (!key) {
    return NextResponse.json(
      {
        listings: [] as OpenSeaListingRow[],
        error: "OpenSea API key not configured",
        venue: "opensea",
      },
      { status: 200 }
    )
  }

  try {
    const url = `https://api.opensea.io/api/v2/listings/collection/${OPENSEA_COLLECTION_SLUG}/best?limit=50`
    const res = await fetch(url, {
      headers: { "x-api-key": key, accept: "application/json" },
      next: { revalidate: 30 },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json(
        {
          listings: [] as OpenSeaListingRow[],
          error: `OpenSea ${res.status}: ${body.slice(0, 120)}`,
          venue: "opensea",
        },
        { status: 200 }
      )
    }

    const json = (await res.json()) as {
      listings?: Array<{
        order_hash?: string
        chain?: string
        protocol_data?: {
          parameters?: {
            offerer?: string
            offer?: Array<{ token?: string; identifierOrCriteria?: string }>
          }
        }
        price?: {
          current?: {
            currency?: string
            decimals?: number
            value?: string
          }
        }
        status?: string
      }>
    }

    const listings: OpenSeaListingRow[] = []
    for (const row of json.listings ?? []) {
      const offer = row.protocol_data?.parameters?.offer?.[0]
      const tokenId = offer?.identifierOrCriteria
      const price = row.price?.current
      if (!tokenId || !price?.value) continue
      const decimals = price.decimals ?? 18
      const raw = BigInt(price.value)
      const eth = Number(raw) / 10 ** decimals
      const maker = (row.protocol_data?.parameters?.offerer ?? "").toLowerCase()
      listings.push({
        tokenId: String(tokenId),
        priceEth: eth.toFixed(eth >= 0.01 ? 4 : 6),
        priceRaw: price.value,
        decimals,
        currency: price.currency ?? "ETH",
        orderHash: row.order_hash ?? "",
        maker,
        permalink: `https://opensea.io/item/${OPENSEA_CHAIN_SLUG}/${(offer.token ?? "").toLowerCase()}/${tokenId}`,
        status: row.status ?? "ACTIVE",
      })
    }

    return NextResponse.json(
      {
        listings,
        venue: "opensea",
        note: "Seaport orders — not CardMarketplace.list",
        updatedAt: Date.now(),
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=90" } }
    )
  } catch (e) {
    return NextResponse.json(
      {
        listings: [] as OpenSeaListingRow[],
        error: e instanceof Error ? e.message : "opensea unavailable",
        venue: "opensea",
      },
      { status: 200 }
    )
  }
}
