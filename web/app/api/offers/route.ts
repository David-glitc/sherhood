import { NextResponse } from "next/server"
import { isAddress, recoverMessageAddress } from "viem"
import { getDb, mongoConfigured } from "@/lib/mongo"
import { potCardConfig, POT_CARD_ADDRESS } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { cardOfferMessage } from "@/lib/card-offer"
import { ROBINHOOD_CHAIN_ID } from "@/lib/chain"

export const dynamic = "force-dynamic"

export type CardOffer = {
  tokenId: string
  seller: string
  buyer: string
  amountUsdg: string
  note?: string
  createdAt: number
  status: "open" | "withdrawn" | "accepted"
  card?: string
  chainId?: number
}

/** List open offers for a seller or token. */
export async function GET(request: Request) {
  if (!mongoConfigured()) {
    return NextResponse.json({ offers: [] })
  }
  const { searchParams } = new URL(request.url)
  const seller = searchParams.get("seller")?.toLowerCase()
  const tokenId = searchParams.get("tokenId")
  const db = await getDb()
  const col = db.collection<CardOffer>("card_offers")
  const filter: Record<string, unknown> = { status: "open" }
  if (seller && isAddress(seller)) filter.seller = seller
  if (tokenId) filter.tokenId = tokenId
  const offers = await col
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()
  return NextResponse.json({
    offers: offers.map((row) => {
      const { _id, ...rest } = row
      void _id
      return rest
    }),
  })
}

/** Place an off-chain offer on a Sherd (listed or not). */
export async function POST(request: Request) {
  if (!mongoConfigured()) {
    return NextResponse.json({ error: "Offers unavailable" }, { status: 503 })
  }

  let body: {
    tokenId?: string
    seller?: string
    buyer?: string
    amountUsdg?: string
    note?: string
    nonce?: string
    signature?: `0x${string}`
    card?: string
    chainId?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const tokenId = String(body.tokenId || "").trim()
  const seller = body.seller?.trim().toLowerCase()
  const buyer = body.buyer?.trim().toLowerCase()
  const amountUsdg = String(body.amountUsdg || "").trim()
  const nonce = String(body.nonce || "").trim()
  const amount = Number(amountUsdg)
  const card = (body.card || POT_CARD_ADDRESS).toLowerCase()
  const chainId = Number(body.chainId ?? ROBINHOOD_CHAIN_ID)

  if (!tokenId || !/^\d+$/.test(tokenId)) {
    return NextResponse.json({ error: "invalid tokenId" }, { status: 400 })
  }
  if (!seller || !isAddress(seller) || !buyer || !isAddress(buyer)) {
    return NextResponse.json({ error: "invalid addresses" }, { status: 400 })
  }
  if (seller === buyer) {
    return NextResponse.json({ error: "Cannot offer on your own card" }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return NextResponse.json({ error: "Enter a USDG amount" }, { status: 400 })
  }
  if (card !== POT_CARD_ADDRESS.toLowerCase() || chainId !== ROBINHOOD_CHAIN_ID) {
    return NextResponse.json({ error: "Offer is for a different chain or card" }, { status: 400 })
  }
  const signedAt = Number(nonce)
  if (
    !body.signature ||
    !Number.isSafeInteger(signedAt) ||
    Math.abs(Date.now() - signedAt) > 10 * 60_000
  ) {
    return NextResponse.json({ error: "Offer signature expired" }, { status: 401 })
  }

  try {
    const signer = await recoverMessageAddress({
      message: cardOfferMessage({
        tokenId,
        seller,
        buyer,
        amountUsdg,
        nonce,
        card,
        chainId,
      }),
      signature: body.signature,
    })
    if (signer.toLowerCase() !== buyer) {
      return NextResponse.json({ error: "Offer signature does not match buyer" }, { status: 401 })
    }
    const [currentOwner, cardRaw] = await Promise.all([
      rhPublicClient.readContract({
        ...potCardConfig,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      }) as Promise<string>,
      rhPublicClient.readContract({
        ...potCardConfig,
        functionName: "getCard",
        args: [BigInt(tokenId)],
      }),
    ])
    if (currentOwner.toLowerCase() !== seller) {
      return NextResponse.json(
        { error: "Sherd owner changed. Refresh and try again." },
        { status: 409 }
      )
    }
    const claimed = Boolean(
      Array.isArray(cardRaw)
        ? cardRaw[5]
        : (cardRaw as { claimed?: boolean }).claimed
    )
    if (claimed) {
      return NextResponse.json({ error: "This Sherd is already claimed" }, { status: 409 })
    }
  } catch {
    return NextResponse.json({ error: "Could not verify this Sherd offer" }, { status: 400 })
  }

  const offer: CardOffer = {
    tokenId,
    seller,
    buyer,
    amountUsdg: String(amount),
    note: body.note?.trim().slice(0, 140) || undefined,
    createdAt: Date.now(),
    status: "open",
    card,
    chainId,
  }

  const db = await getDb()
  const offers = db.collection<CardOffer>("card_offers")
  await offers.createIndex({ seller: 1, status: 1 }).catch(() => undefined)
  await offers.createIndex({ tokenId: 1, status: 1 }).catch(() => undefined)
  await offers.createIndex({ tokenId: 1, buyer: 1, status: 1 }).catch(() => undefined)
  await offers.updateOne(
    { tokenId, buyer, status: "open" },
    { $set: offer },
    { upsert: true }
  )

  return NextResponse.json({ ok: true, offer })
}
