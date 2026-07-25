"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { useReadContracts } from "wagmi"
import { potCardConfig, potAbi } from "@/lib/contracts"
import { useOpenSeaListings } from "@/hooks/use-opensea-listings"
import {
  ownershipPct,
  parseHoldings,
  RARITIES,
  effectiveRarityIndex,
} from "@/hooks/use-pots"
import { buttonVariants } from "@/components/ui/button"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { UserChip } from "@/components/profile/user-chip"
import { useProfiles } from "@/hooks/use-profiles"
import { OPENSEA_COLLECTION_URL } from "@/lib/protocol"

/**
 * Market = listings created in-app via Seaport (OpenSea).
 * One list path → same order on OpenSea and here.
 */
export default function MarketplacePage() {
  const { listings, loading, error } = useOpenSeaListings(true)

  const tokenIds = useMemo(
    () => listings.map((l) => BigInt(l.tokenId)),
    [listings]
  )

  const { data: cards } = useReadContracts({
    contracts: tokenIds.map((id) => ({
      ...potCardConfig,
      functionName: "getCard",
      args: [id],
    })),
    query: { enabled: tokenIds.length > 0 },
  })

  const pots = useMemo(() => {
    if (!cards) return [] as (`0x${string}` | undefined)[]
    return cards.map((c) => {
      if (c.status !== "success") return undefined
      const raw = c.result as { pot: `0x${string}` } | unknown[]
      return (Array.isArray(raw) ? raw[0] : (raw as { pot: `0x${string}` }).pot) as `0x${string}`
    })
  }, [cards])

  const { data: holdingsBatches } = useReadContracts({
    contracts: pots.filter(Boolean).map((pot) => ({
      address: pot!,
      abi: potAbi,
      functionName: "getHoldings",
    })),
    query: { enabled: pots.some(Boolean) },
  })

  const { get: getProfile } = useProfiles(listings.map((l) => l.maker))

  const rows = useMemo(() => {
    return listings.map((os, i) => {
      const cardRaw = cards?.[i]?.status === "success" ? cards[i].result : null
      const ownershipWeight = cardRaw
        ? Array.isArray(cardRaw)
          ? (cardRaw[2] as bigint)
          : (cardRaw as { ownershipWeight: bigint }).ownershipWeight
        : 0n
      const onChainRarity = cardRaw
        ? Number(Array.isArray(cardRaw) ? cardRaw[3] : (cardRaw as { rarity: number }).rarity)
        : 0
      const revealed = cardRaw
        ? Boolean(Array.isArray(cardRaw) ? cardRaw[4] : (cardRaw as { revealed: boolean }).revealed)
        : false
      const claimed = cardRaw
        ? Boolean(Array.isArray(cardRaw) ? cardRaw[5] : (cardRaw as { claimed: boolean }).claimed)
        : false
      const rarityIdx = effectiveRarityIndex(revealed, onChainRarity, ownershipWeight)
      const holdingIdx = pots.slice(0, i + 1).filter(Boolean).length - 1
      const holdingsRaw =
        holdingsBatches?.[holdingIdx]?.status === "success"
          ? (holdingsBatches[holdingIdx].result as [string[], bigint[]])
          : undefined
      const holdings = parseHoldings(
        holdingsRaw?.[0] as `0x${string}`[] | undefined,
        holdingsRaw?.[1]
      )
      return { os, rarityIdx, revealed, claimed, holdings, ownershipWeight }
    })
  }, [listings, cards, pots, holdingsBatches])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Trade"
        title="Market"
        description="List in Sherhood → live on OpenSea. One Seaport listing, both places."
        actions={
          <>
            <Link href="/sherds" className={buttonVariants({ variant: "outline", size: "sm" })}>
              All Sherds
            </Link>
            <Link href="/inventory" className={buttonVariants({ size: "sm" })}>
              List yours
            </Link>
            <a
              href={OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
            >
              OpenSea
              <ExternalLink className="size-3.5" />
            </a>
          </>
        }
      />

      {loading ? (
        <div className="responsive-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="product-surface p-3">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#070707] px-6 py-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "url(/cards/mystery.jpg), url(/cards/legendary.jpg), url(/cards/epic.jpg), url(/brand/sherhood-banner.jpg)",
              backgroundSize: "160px auto, 140px auto, 120px auto, cover",
              backgroundPosition: "12% 55%, 55% 30%, 88% 60%, center",
              backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
              filter: "grayscale(0.35) blur(1.5px) brightness(0.85)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/88 to-[#070707]/45"
          />
          <div className="relative">
            <div className="mx-auto mb-5 flex justify-center gap-3 opacity-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cards/mystery.webp"
                alt=""
                className="h-24 w-auto rotate-[-8deg] rounded-lg shadow-[0_0_40px_rgba(204,255,0,0.15)]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cards/rare.webp"
                alt=""
                className="mt-3 h-28 w-auto rotate-[4deg] rounded-lg opacity-80"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cards/legendary.webp"
                alt=""
                className="h-24 w-auto rotate-[10deg] rounded-lg opacity-60"
              />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ccff00]/80">
              Floor is open
            </p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-white">
              No live asks yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/45">
              {error ??
                "Be first — list a Sherd from your collection. Same order hits OpenSea."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/inventory" className={buttonVariants()}>
                List yours
              </Link>
              <Link href="/sherds" className={buttonVariants({ variant: "outline" })}>
                Browse Sherds
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="responsive-grid">
          {rows.map(({ os, rarityIdx, revealed, claimed, holdings, ownershipWeight }) => (
            <div
              key={os.orderHash || os.tokenId}
              className="product-surface min-w-0 overflow-hidden p-3 transition hover:border-[#ccff00]/30"
            >
              <Link href={`/sherds/${os.tokenId}`} className="block">
                <PotNftCard
                  rarityIndex={rarityIdx}
                  revealed={revealed}
                  tokenId={BigInt(os.tokenId)}
                  stockLabel={
                    holdings.length > 0 ? `${holdings.length}-asset vault` : "Sherd"
                  }
                  ownershipPct={revealed ? ownershipPct(ownershipWeight) : undefined}
                  size="fill"
                  interactive
                  tilt
                />
              </Link>
              <div className="mt-3 flex items-end justify-between gap-2 px-1">
                <div>
                  <p className="text-lg font-bold tabular-nums text-[#ccff00]">
                    {os.priceEth} {os.currency}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    #{os.tokenId} · {RARITIES[rarityIdx] ?? "Sherd"}
                    {holdings.length > 0 ? ` · ${holdings.length} assets` : ""}
                  </p>
                </div>
                <CardStateBadge revealed={revealed} claimed={claimed} />
              </div>
              {os.maker ? (
                <div className="mt-2 px-1">
                  <UserChip
                    address={os.maker}
                    name={getProfile(os.maker)?.name}
                    avatarId={getProfile(os.maker)?.avatarId}
                    size={20}
                  />
                </div>
              ) : null}
              <a
                href={os.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-3 w-full gap-1.5 bg-[#ccff00] font-semibold text-black hover:opacity-90"
                )}
              >
                Buy
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </PageShell>
  )
}
