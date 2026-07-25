"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potCardConfig, potAbi } from "@/lib/contracts"
import { useOpenSeaListings } from "@/hooks/use-opensea-listings"
import { fmtUsdg, ownershipPct, parseHoldings, RARITIES, effectiveRarityIndex } from "@/hooks/use-pots"
import { Button, buttonVariants } from "@/components/ui/button"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { SherdInspectModal, type SherdInspectData } from "@/components/sherds/sherd-inspect-modal"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { basketName } from "@/lib/basket-name"
import { UserChip } from "@/components/profile/user-chip"
import { OfferDialog } from "@/components/profile/offer-dialog"
import { useProfiles } from "@/hooks/use-profiles"

const PAGE_SIZE = 48

type Filter = "all" | "listed" | "revealed" | "sealed"

/** Public Sherds catalog — OpenSea prices when listed in-app (Seaport). */
export default function SherdsCatalogPage() {
  const { address } = useAccount()
  const [filter, setFilter] = useState<Filter>("all")
  const [inspect, setInspect] = useState<SherdInspectData | null>(null)
  const [offerTarget, setOfferTarget] = useState<{
    tokenId: bigint
    seller: string
    sealed: boolean
  } | null>(null)
  const { byTokenId: openSeaListing } = useOpenSeaListings(true)

  const { data: totalMintedRaw, isLoading: mintedLoading } = useReadContract({
    ...potCardConfig,
    functionName: "totalMinted",
    args: [],
  })

  const tokenIds = useMemo(() => {
    const minted = Number(totalMintedRaw ?? 0n)
    if (!Number.isFinite(minted) || minted <= 0) return [] as bigint[]
    const start = Math.max(1, minted - PAGE_SIZE + 1)
    const ids: bigint[] = []
    for (let i = minted; i >= start; i--) ids.push(BigInt(i))
    return ids
  }, [totalMintedRaw])

  const { data: cards, isLoading: cardsLoading } = useReadContracts({
    contracts: tokenIds.map((id) => ({
      ...potCardConfig,
      functionName: "getCard",
      args: [id],
    })),
    query: { enabled: tokenIds.length > 0 },
  })

  const { data: owners } = useReadContracts({
    contracts: tokenIds.map((id) => ({
      ...potCardConfig,
      functionName: "ownerOf",
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

  const uniquePots = useMemo(() => {
    const seen = new Set<string>()
    const list: `0x${string}`[] = []
    for (const p of pots) {
      if (!p) continue
      const key = p.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      list.push(p)
    }
    return list
  }, [pots])

  const { data: holdingsBatches } = useReadContracts({
    contracts: uniquePots.map((pot) => ({
      address: pot,
      abi: potAbi,
      functionName: "getHoldings",
    })),
    query: { enabled: uniquePots.length > 0 },
  })

  const holdingsByPot = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseHoldings>>()
    uniquePots.forEach((pot, i) => {
      const row = holdingsBatches?.[i]
      if (row?.status !== "success") return
      const raw = row.result as [string[], bigint[]]
      map.set(
        pot.toLowerCase(),
        parseHoldings(raw[0] as `0x${string}`[], raw[1])
      )
    })
    return map
  }, [uniquePots, holdingsBatches])

  const rows = useMemo(() => {
    return tokenIds.flatMap((id, i) => {
      const cardRaw = cards?.[i]?.status === "success" ? cards[i].result : null
      if (!cardRaw) return []
      const pot = (
        Array.isArray(cardRaw)
          ? (cardRaw[0] as `0x${string}`)
          : (cardRaw as { pot: `0x${string}` }).pot
      )
      const depositAmount = Array.isArray(cardRaw)
        ? (cardRaw[1] as bigint)
        : (cardRaw as { depositAmount: bigint }).depositAmount
      const ownershipWeight = Array.isArray(cardRaw)
        ? (cardRaw[2] as bigint)
        : (cardRaw as { ownershipWeight: bigint }).ownershipWeight
      const onChainRarity = Number(
        Array.isArray(cardRaw) ? cardRaw[3] : (cardRaw as { rarity: number }).rarity
      )
      const revealed = Boolean(
        Array.isArray(cardRaw) ? cardRaw[4] : (cardRaw as { revealed: boolean }).revealed
      )
      const claimed = Boolean(
        Array.isArray(cardRaw) ? cardRaw[5] : (cardRaw as { claimed: boolean }).claimed
      )
      if (claimed) return []
      return [
        {
          id,
          pot,
          revealed,
          rarityIdx: effectiveRarityIndex(revealed, onChainRarity, ownershipWeight),
          ownershipWeight,
          depositAmount,
          listing: openSeaListing(String(id)),
          owner:
            owners?.[i]?.status === "success" ? (owners[i].result as string) : null,
          holdings: holdingsByPot.get(pot.toLowerCase()) ?? [],
        },
      ]
    })
  }, [tokenIds, cards, openSeaListing, owners, holdingsByPot])

  const profileAddresses = useMemo(
    () =>
      rows.flatMap((r) => [r.owner, r.listing?.maker].filter(Boolean) as string[]),
    [rows]
  )
  const { get: getProfile } = useProfiles(profileAddresses)

  const filtered = useMemo(() => {
    if (filter === "listed") return rows.filter((r) => r.listing)
    if (filter === "revealed") return rows.filter((r) => r.revealed)
    if (filter === "sealed") return rows.filter((r) => !r.revealed)
    return rows
  }, [rows, filter])

  const loading = mintedLoading || (tokenIds.length > 0 && cardsLoading)
  const minted = Number(totalMintedRaw ?? 0n)

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "listed", label: "For sale" },
    { id: "revealed", label: "Revealed" },
    { id: "sealed", label: "Sealed" },
  ]

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Live cards"
        title="Sherds"
        description="Tap a card to inspect. Open for the full page."
        actions={
          <>
            <Link href="/marketplace" className={buttonVariants({ size: "sm" })}>
              Market
            </Link>
            <Link
              href="/inventory"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Collection
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                filter === f.id
                  ? "border-[#ccff00]/40 bg-[#ccff00]/15 text-[#ccff00]"
                  : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Latest {tokenIds.length}
          {minted > 0 ? ` of ${minted}` : ""}
        </p>
      </div>

      {loading ? (
        <div className="responsive-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="product-surface p-4">
              <Skeleton className="aspect-[2/3] w-full rounded-xl" />
              <Skeleton className="mt-3 h-5 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="product-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">No Sherds match this filter yet.</p>
          <Link href="/app" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
            Explore pools
          </Link>
        </div>
      ) : (
        <div className="responsive-grid">
          {filtered.map((row) => {
            const sleekLabel = row.revealed
              ? row.holdings.length
                ? `${row.holdings.length}-asset vault`
                : basketName(row.pot)
              : basketName(row.pot)
            return (
              <div
                key={String(row.id)}
                className="product-surface min-w-0 p-3 transition hover:border-[#ccff00]/25"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <CardStateBadge revealed={row.revealed} claimed={false} />
                  {row.listing ? (
                    <span className="rounded-full border border-[#ccff00]/35 bg-[#ccff00]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ccff00]">
                      For sale
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="mx-auto block w-full max-w-[160px]"
                  onClick={() =>
                    setInspect({
                      tokenId: row.id,
                      rarityIdx: row.rarityIdx,
                      revealed: row.revealed,
                      ownershipWeight: row.ownershipWeight,
                      depositAmount: row.depositAmount,
                      pot: row.pot,
                      potLabel: basketName(row.pot),
                      holdings: row.holdings,
                      listingEth: row.listing?.priceEth,
                      listingCurrency: row.listing?.currency,
                    })
                  }
                >
                  <PotNftCard
                    rarityIndex={row.rarityIdx}
                    revealed={row.revealed}
                    tokenId={row.id}
                    stockLabel={sleekLabel}
                    ownershipPct={
                      row.revealed ? ownershipPct(row.ownershipWeight) : undefined
                    }
                    size="fill"
                    interactive
                    tilt
                  />
                </button>
                <div className="mt-3 px-0.5">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {RARITIES[row.rarityIdx] ?? "Sherd"} · #{String(row.id)}
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                    {row.listing ? (
                      <span className="text-[#ccff00]">
                        {row.listing.priceEth} {row.listing.currency}
                      </span>
                    ) : (
                      <span>${fmtUsdg(row.depositAmount)}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.listing ? "Ask" : "Mint deposit"}
                  </p>
                </div>
                {row.owner ? (
                  <div className="mt-2">
                    <UserChip
                      address={row.owner}
                      name={getProfile(row.owner)?.name}
                      avatarId={getProfile(row.owner)?.avatarId}
                      size={22}
                    />
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  {!row.listing &&
                  row.owner &&
                  row.owner.toLowerCase() !== address?.toLowerCase() ? (
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        setOfferTarget({
                          tokenId: row.id,
                          seller: row.owner!,
                          sealed: !row.revealed,
                        })
                      }
                    >
                      Make offer
                    </Button>
                  ) : (
                    <Link
                      href={`/sherds/${String(row.id)}`}
                      className={cn(buttonVariants({ size: "sm" }), "flex-1")}
                    >
                      Open
                    </Link>
                  )}
                  <Link
                    href={`/pools/${row.pot}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                  >
                    Pool
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SherdInspectModal
        open={Boolean(inspect)}
        onClose={() => setInspect(null)}
        sherd={inspect}
      />
      {offerTarget ? (
        <OfferDialog
          open
          onOpenChange={(open) => {
            if (!open) setOfferTarget(null)
          }}
          tokenId={offerTarget.tokenId}
          seller={offerTarget.seller}
          sealed={offerTarget.sealed}
        />
      ) : null}
    </PageShell>
  )
}
