import { NextResponse } from "next/server"
import { createPublicClient, http, formatUnits } from "viem"
import { potCardConfig, potAbi } from "@/lib/contracts"
import { cardImageUrl, rarityKeyFromIndex } from "@/lib/card-art"
import { ownershipPct, rarityIndexFromOwnership } from "@/hooks/use-pots"
import { stockByAddress } from "@/lib/basket-stocks"
import { basketName } from "@/lib/basket-name"

const SITE = "https://sherhood.xyz"

const chain = {
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
}

const client = createPublicClient({
  chain,
  transport: http(chain.rpcUrls.default.http[0]),
})

type RouteContext = { params: Promise<{ id: string }> }

const OWNERSHIP_ONE = 10n ** 18n

type BasketBreakdown = {
  constituents: string
  /** Per-stock amounts this card's weight redeems, e.g. [{ symbol: "NVDA", amount: "0.5214" }] */
  shares: { symbol: string; amount: string }[]
}

async function basketBreakdown(
  pot: `0x${string}`,
  ownershipWeight: bigint
): Promise<BasketBreakdown> {
  try {
    const holdings = (await client.readContract({
      address: pot,
      abi: potAbi,
      functionName: "getHoldings",
    })) as readonly [`0x${string}`[], bigint[]]

    const symbols: string[] = []
    const shares: { symbol: string; amount: string }[] = []

    holdings[0].forEach((addr, i) => {
      const symbol = stockByAddress(addr)?.symbol ?? `${addr.slice(0, 6)}…`
      symbols.push(symbol)
      const payout = (holdings[1][i] * ownershipWeight) / OWNERSHIP_ONE
      const amount = Number(formatUnits(payout, 18))
      shares.push({
        symbol,
        amount: amount.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        }),
      })
    })

    return { constituents: symbols.join(", "), shares }
  } catch {
    return { constituents: "", shares: [] }
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid token id" }, { status: 400 })
  }

  const tokenId = BigInt(id)
  const address = potCardConfig.address

  if (address === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "PotCard not configured" }, { status: 503 })
  }

  try {
    const card = (await client.readContract({
      address,
      abi: potCardConfig.abi,
      functionName: "getCard",
      args: [tokenId],
    })) as {
      pot: `0x${string}`
      depositAmount: bigint
      ownershipWeight: bigint
      rarity: number
      revealed: boolean
      claimed: boolean
    }

    // Claimed and early-exited cards are burned on-chain; storage is zeroed.
    if (card.pot === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "Card burned (claimed or exited)" },
        { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } }
      )
    }

    // Rarity is stored on-chain at reveal (share bands). Fall back to ownership math for legacy.
    const rarityIdx = card.revealed
      ? card.rarity >= 1 && card.rarity <= 4
        ? Number(card.rarity)
        : rarityIndexFromOwnership(card.ownershipWeight)
      : 0
    const rarityKey = card.revealed ? rarityKeyFromIndex(rarityIdx) : "unrevealed"
    const rarityLabel =
      rarityKey === "unrevealed"
        ? "Sealed"
        : rarityKey.charAt(0).toUpperCase() + rarityKey.slice(1)
    const image = cardImageUrl(rarityIdx, card.revealed)
    const depositUsdg = Number(
      card.depositAmount >= 10n ** 15n
        ? formatUnits(card.depositAmount, 18)
        : formatUnits(card.depositAmount, 6)
    )
    const state = card.revealed ? "Revealed" : "Unrevealed"
    const weightPct = ownershipPct(card.ownershipWeight)
    const { constituents, shares } = card.revealed
      ? await basketBreakdown(card.pot, card.ownershipWeight)
      : { constituents: "", shares: [] }

    const sharesLine = shares.map((s) => `${s.amount} ${s.symbol}`).join(", ")

    const potName = basketName(card.pot)
    const metadata = {
      name: card.revealed
        ? `Sherhood Sherd #${id} — ${rarityLabel}`
        : `Sherhood Sherd #${id} — Sealed`,
      description: card.revealed
        ? `Revealed Sherd from the ${potName} basket. Owns ${weightPct}% of ${card.pot}${
            sharesLine ? ` — redeems ${sharesLine}` : constituents ? ` (${constituents})` : ""
          }. Rarity tracks ownership share.${card.claimed ? " Already claimed." : ""}`
        : `Unrevealed Sherd from the ${potName} pool. Ownership % and rarity unlock at reveal. View at ${SITE}/sherds/${id}`,
      image,
      external_url: `${SITE}/sherds/${id}`,
      animation_url: undefined,
      attributes: [
        { trait_type: "State", value: state },
        { trait_type: "Basket", value: potName },
        { trait_type: "Basket Address", value: card.pot },
        { trait_type: "Deposit (USDG)", value: Number(depositUsdg.toFixed(2)) },
        ...(card.revealed
          ? [
              { trait_type: "Rarity", value: rarityLabel },
              { trait_type: "Ownership Weight", value: `${weightPct}%` },
              ...(constituents
                ? [{ trait_type: "Constituents", value: constituents }]
                : []),
              ...shares.map((s) => ({
                trait_type: `${s.symbol} Share`,
                value: s.amount,
              })),
              { trait_type: "Claimed", value: card.claimed ? "Yes" : "No" },
            ]
          : []),
      ],
    }

    // Freeze only after claim — revealed-but-unclaimed must refresh so Claimed flips.
    const cache = card.claimed
      ? "public, max-age=86400, s-maxage=86400, immutable"
      : "public, s-maxage=60, stale-while-revalidate=300"

    return NextResponse.json(metadata, {
      headers: {
        "Cache-Control": cache,
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch {
    return NextResponse.json({ error: "Token not found" }, { status: 404 })
  }
}
