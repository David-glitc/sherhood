"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potFactoryConfig, potCardConfig, potAbi } from "@/lib/contracts"
import { useClaimCard } from "@/hooks/use-claim-card"
import { useStockPrices } from "@/hooks/use-stock-prices"
import {
  RARITIES,
  fmtUsdg,
  holdingsLabel,
  ownershipPct,
  parseHoldings,
  effectiveRarityIndex,
} from "@/hooks/use-pots"
import { basketName } from "@/lib/basket-name"
import { ClaimableStockRow } from "@/components/stocks/claimable-stock-row"
import { TradingViewSymbolTabs } from "@/components/stocks/tradingview-mini"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { computeDerivedShare, shareToPct } from "@/lib/derived-value"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { AccountSubnav } from "@/components/profile/account-subnav"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ShareButton } from "@/components/share/share-button"
import { OpenSeaLink } from "@/components/share/opensea-link"
import { ListForSale } from "@/components/market/list-for-sale"
import { SherdRevealTrigger } from "@/components/reveal/sherd-reveal"
import { AddSherdsToWalletButton } from "@/components/wallet/add-sherds-to-wallet"
import { OPENSEA_COLLECTION_URL } from "@/lib/protocol"
import { ExternalLink } from "lucide-react"

type Filter = "all" | "sealed" | "revealed" | "claimable"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sealed", label: "Sealed" },
  { id: "revealed", label: "Revealed" },
  { id: "claimable", label: "Claimable" },
]

export default function InventoryPage() {
  const { address, isConnected } = useAccount()
  const { claim, isPending: claimPending } = useClaimCard()
  const [filter, setFilter] = useState<Filter>("all")
  const [selected, setSelected] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSelected(id)
  }

  const clearPicked = () => setPicked(new Set())

  const { data: potsData, isLoading: potsLoading } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
    query: { enabled: isConnected },
  })
  const pots = (potsData as `0x${string}`[] | undefined) ?? []

  const { data: idBatches, isLoading: idsLoading } = useReadContracts({
    contracts: pots.map((pot) => ({
      ...potCardConfig,
      functionName: "potTokenIds",
      args: [pot],
    })),
    query: { enabled: isConnected && pots.length > 0 },
  })

  const allTokenIds = useMemo(() => {
    const ids: bigint[] = []
    if (!idBatches) return ids
    for (const batch of idBatches) {
      if (batch.status === "success" && Array.isArray(batch.result)) {
        for (const id of batch.result as bigint[]) ids.push(id)
      }
    }
    return ids
  }, [idBatches])

  const { data: ownership, isLoading: ownershipLoading } = useReadContracts({
    contracts: allTokenIds.flatMap((tokenId) => [
      { ...potCardConfig, functionName: "ownerOf", args: [tokenId] },
      { ...potCardConfig, functionName: "getCard", args: [tokenId] },
    ]),
    query: { enabled: isConnected && allTokenIds.length > 0 },
  })

  const myCards = useMemo(() => {
    if (!ownership || !address) return []
    const cards: {
      tokenId: bigint
      pot: `0x${string}`
      depositAmount: bigint
      ownershipWeight: bigint
      rarity: number
      revealed: boolean
      claimed: boolean
    }[] = []

    for (let i = 0; i < allTokenIds.length; i++) {
      const ownerRes = ownership[i * 2]
      const cardRes = ownership[i * 2 + 1]
      if (ownerRes?.status !== "success" || cardRes?.status !== "success") continue
      const owner = ownerRes.result as string
      if (owner.toLowerCase() !== address.toLowerCase()) continue

      const raw = cardRes.result as
        | {
            pot: `0x${string}`
            depositAmount: bigint
            ownershipWeight: bigint
            rarity: number
            revealed: boolean
            claimed: boolean
          }
        | unknown[]
      const pot = (Array.isArray(raw) ? raw[0] : (raw as { pot: `0x${string}` }).pot) as `0x${string}`
      const depositAmount = (
        Array.isArray(raw) ? raw[1] : (raw as { depositAmount: bigint }).depositAmount
      ) as bigint
      const ownershipWeight = (
        Array.isArray(raw) ? raw[2] : (raw as { ownershipWeight: bigint }).ownershipWeight
      ) as bigint
      const rarity = Number(Array.isArray(raw) ? raw[3] : (raw as { rarity: number }).rarity)
      const revealed = Boolean(Array.isArray(raw) ? raw[4] : (raw as { revealed: boolean }).revealed)
      const claimed = Boolean(Array.isArray(raw) ? raw[5] : (raw as { claimed: boolean }).claimed)

      cards.push({
        tokenId: allTokenIds[i],
        pot,
        depositAmount,
        ownershipWeight,
        rarity,
        revealed,
        claimed,
      })
    }
    return cards
  }, [ownership, address, allTokenIds])
  const cardsLoading = potsLoading || idsLoading || ownershipLoading

  const { data: potHoldings } = useReadContracts({
    contracts: myCards.map((c) => ({
      address: c.pot,
      abi: potAbi,
      functionName: "getHoldings",
    })),
    query: { enabled: myCards.length > 0 },
  })

  const { data: potStatuses } = useReadContracts({
    contracts: myCards.map((c) => ({
      address: c.pot,
      abi: potAbi,
      functionName: "status",
    })),
    query: { enabled: myCards.length > 0 },
  })

  const { data: potTotals } = useReadContracts({
    contracts: myCards.map((c) => ({
      address: c.pot,
      abi: potAbi,
      functionName: "totalDeposited",
    })),
    query: { enabled: myCards.length > 0 },
  })

  const enriched = useMemo(() => {
    return myCards.map((card, idx) => {
      const rarityIdx = effectiveRarityIndex(
        card.revealed,
        card.rarity,
        card.ownershipWeight
      )
      const holdingsRaw =
        potHoldings?.[idx]?.status === "success"
          ? (potHoldings[idx].result as [string[], bigint[]])
          : undefined
      const holdings = parseHoldings(
        holdingsRaw?.[0] as `0x${string}`[] | undefined,
        holdingsRaw?.[1]
      )
      const potStatus =
        potStatuses?.[idx]?.status === "success" ? Number(potStatuses[idx].result) : -1
      const canClaim = card.revealed && !card.claimed && potStatus === 3
      const totalDeposited =
        potTotals?.[idx]?.status === "success" ? (potTotals[idx].result as bigint) : 0n
      const share = computeDerivedShare({
        depositAmount: card.depositAmount,
        totalDeposited,
        ownershipWeight: card.ownershipWeight,
        revealed: card.revealed,
        claimed: card.claimed,
      })
      return {
        ...card,
        idx,
        rarityIdx,
        rarity: RARITIES[rarityIdx] ?? "Unrevealed",
        holdings,
        canClaim,
        share,
      }
    })
  }, [myCards, potHoldings, potStatuses, potTotals])

  const filtered = useMemo(() => {
    if (filter === "sealed") return enriched.filter((c) => !c.revealed)
    if (filter === "revealed") return enriched.filter((c) => c.revealed && !c.claimed)
    if (filter === "claimable") return enriched.filter((c) => c.canClaim)
    return enriched
  }, [enriched, filter])

  const selectedCard = useMemo(() => {
    const id = selected ?? filtered[0]?.tokenId.toString() ?? null
    if (!id) return null
    return enriched.find((c) => String(c.tokenId) === id) ?? null
  }, [selected, filtered, enriched])

  const claimableSymbols = useMemo(() => {
    if (!selectedCard) return []
    return selectedCard.holdings.map((h) => h.symbol)
  }, [selectedCard])
  const { quotes } = useStockPrices(claimableSymbols)

  if (!isConnected || !address) {
    return (
      <PageShell wide>
        <AccountSubnav />
        <PageHeader
          eyebrow="Account"
          title="Collection"
          description="Connect a wallet to browse sealed and revealed ownership Sherds."
        />
        <div className="product-surface p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Wallet required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect to load your Sherd collection.
          </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell wide>
      <AccountSubnav />
      <PageHeader
        eyebrow="Account"
        title="Collection"
        description="Your Sherds — rip, claim, list."
        actions={
          <>
            <AddSherdsToWalletButton />
            <a
              href={OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
            >
              <ExternalLink className="size-3.5" aria-hidden />
              OpenSea
            </a>
            <Link href="/app" className={buttonVariants({ size: "sm" })}>
              Pools
            </Link>
          </>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count =
            f.id === "all"
              ? enriched.length
              : f.id === "sealed"
                ? enriched.filter((c) => !c.revealed).length
                : f.id === "revealed"
                  ? enriched.filter((c) => c.revealed && !c.claimed).length
                  : enriched.filter((c) => c.canClaim).length
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                filter === f.id
                  ? "border-[#ccff00]/50 bg-[#ccff00]/15 text-[#ccff00]"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white"
              )}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
        {picked.size > 0 ? (
          <button
            type="button"
            onClick={clearPicked}
            className="ml-auto text-xs text-white/40 hover:text-white/70"
          >
            Clear {picked.size}
          </button>
        ) : null}
      </div>

      {picked.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#ccff00]/25 bg-[#ccff00]/[0.06] px-3 py-2.5">
          <span className="text-xs font-semibold text-[#ccff00]">
            {picked.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {(() => {
              const claimables = filtered.filter(
                (c) => picked.has(String(c.tokenId)) && c.canClaim
              )
              return (
                <>
                  {claimables.length > 0 ? (
                    <Button
                      size="sm"
                      className="h-8 rounded-lg bg-[#ccff00] text-xs font-semibold text-black"
                      disabled={claimPending}
                      onClick={async () => {
                        for (const c of claimables) {
                          try {
                            await claim(c.pot, c.tokenId)
                          } catch {
                            /* continue */
                          }
                        }
                        clearPicked()
                      }}
                    >
                      Claim {claimables.length}
                    </Button>
                  ) : null}
                  {picked.size === 1 ? (
                    <Link
                      href={`/sherds/${[...picked][0]}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
                    >
                      Open
                    </Link>
                  ) : null}
                </>
              )
            })()}
          </div>
        </div>
      ) : null}

      {cardsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-2xl" />
          ))}
        </div>
      ) : myCards.length === 0 ? (
        <div className="product-surface p-8 text-center sm:p-12">
          <h2 className="text-xl font-semibold">No Sherds yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Drop into an open pool to mint your first sealed Sherd — then trade it here or on OpenSea.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/app" className={buttonVariants()}>
              Browse pools
            </Link>
            <OpenSeaLink className="w-auto px-4" />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          {/* Showcase grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((card, idx) => {
              const idKey = String(card.tokenId)
              const active = selectedCard && String(selectedCard.tokenId) === idKey
              return (
                <motion.div
                  key={idKey}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.28) }}
                  className="min-w-0"
                >
                  <div
                    className={cn(
                      "group relative block rounded-2xl outline-none transition",
                      "focus-within:ring-2 focus-within:ring-[#ccff00]/50",
                      (active || picked.has(idKey)) && "ring-2 ring-[#ccff00]/45"
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={picked.has(idKey)}
                      aria-label={picked.has(idKey) ? "Deselect Sherd" : "Select Sherd"}
                      onClick={(e) => {
                        e.preventDefault()
                        togglePick(idKey)
                      }}
                      className={cn(
                        "absolute left-2 top-2 z-30 flex size-7 items-center justify-center rounded-full border text-[11px] font-bold transition",
                        picked.has(idKey)
                          ? "border-[#ccff00] bg-[#ccff00] text-black"
                          : "border-white/20 bg-black/60 text-white/70 hover:border-[#ccff00]/50"
                      )}
                    >
                      {picked.has(idKey) ? "✓" : ""}
                    </button>
                    <Link
                      href={`/sherds/${idKey}`}
                      onMouseEnter={() => setSelected(idKey)}
                      onFocus={() => setSelected(idKey)}
                      className="block"
                    >
                      <div className="absolute right-2 top-2 z-20">
                        <CardStateBadge revealed={card.revealed} claimed={card.claimed} />
                      </div>
                      <PotNftCard
                        rarityIndex={card.rarityIdx}
                        revealed={card.revealed}
                        tokenId={card.tokenId}
                        stockLabel={
                          card.revealed
                            ? card.holdings.length
                              ? `${card.holdings.length}-asset vault`
                              : basketName(card.pot)
                            : basketName(card.pot)
                        }
                        ownershipPct={
                          card.revealed
                            ? ownershipPct(card.ownershipWeight)
                            : undefined
                        }
                        size="fill"
                        interactive
                        tilt
                      />
                      <p className="mt-2 truncate text-center text-[12px] font-medium text-white/70">
                        #{idKey}
                        <span className="text-white/35">
                          {" "}
                          · {card.revealed ? "Own" : "Fair"} {shareToPct(card.share)}%
                        </span>
                      </p>
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Detail rail */}
          <aside className="product-surface sticky top-24 h-fit p-4 sm:p-5">
            {!selectedCard ? (
              <p className="text-sm text-muted-foreground">
                Tap a card to preview. Use ✓ to multi-select.
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ccff00]/80">
                      {selectedCard.rarity}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      Sherd #{String(selectedCard.tokenId)}
                    </h2>
                    <p className="mt-0.5 text-xs text-white/45">
                      {basketName(selectedCard.pot)}
                      {selectedCard.holdings.length > 0
                        ? ` · ${holdingsLabel(selectedCard.holdings)}`
                        : ""}
                    </p>
                  </div>
                  <CardStateBadge
                    revealed={selectedCard.revealed}
                    claimed={selectedCard.claimed}
                  />
                </div>

                <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/40">Deposit</dt>
                    <dd className="font-medium tabular-nums text-white">
                      ${fmtUsdg(selectedCard.depositAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/40">
                      {selectedCard.revealed ? "Ownership" : "Fair share"}
                    </dt>
                    <dd className="font-semibold tabular-nums text-white">
                      {shareToPct(selectedCard.share)}%
                    </dd>
                  </div>
                </dl>

                {selectedCard.revealed &&
                  !selectedCard.claimed &&
                  selectedCard.holdings.length > 0 && (
                    <div className="mt-4 border-t border-white/[0.06] pt-3">
                      {selectedCard.holdings.map((h) => {
                        const payout =
                          (h.amount * selectedCard.ownershipWeight) / 10n ** 18n
                        const q = quotes[h.symbol]
                        return (
                          <ClaimableStockRow
                            key={h.symbol}
                            symbol={h.symbol}
                            amountWei={payout}
                            price={q?.price}
                            changePct={q?.changePct}
                          />
                        )
                      })}
                      {selectedCard.canClaim && (
                        <TradingViewSymbolTabs
                          className="mt-2"
                          symbols={selectedCard.holdings.map((h) => h.symbol)}
                          height={120}
                        />
                      )}
                    </div>
                  )}

                <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                  <OpenSeaLink tokenId={selectedCard.tokenId} />
                  {selectedCard.revealed ? (
                    <SherdRevealTrigger
                      label="Rip pack"
                      className="w-full min-h-10 border-[#ccff00]/35 bg-[#ccff00]/10 text-[#ccff00]"
                      sherd={{
                        tokenId: String(selectedCard.tokenId),
                        rarityIndex: selectedCard.rarityIdx,
                        ownershipPct: ownershipPct(selectedCard.ownershipWeight),
                        potName: basketName(selectedCard.pot),
                        holdings: selectedCard.holdings.map((h) => h.symbol),
                      }}
                    />
                  ) : null}
                  <div className="flex gap-2">
                    <Link
                      href={`/sherds/${selectedCard.tokenId}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                    >
                      Details
                    </Link>
                    <ShareButton
                      path={`/sherds/${selectedCard.tokenId}`}
                      title={`Sherd #${selectedCard.tokenId} · ${selectedCard.rarity}`}
                      text={`Check out my Sherd #${selectedCard.tokenId} on Sherhood.`}
                      compact
                    />
                  </div>

                  {selectedCard.canClaim && (
                    <Button
                      className="h-10 w-full rounded-xl bg-sherhood text-sm font-semibold text-black hover:brightness-110"
                      disabled={claimPending}
                      onClick={() => claim(selectedCard.pot, selectedCard.tokenId)}
                    >
                      {claimPending ? "Claiming…" : "Claim stocks · burn Sherd"}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => togglePick(String(selectedCard.tokenId))}
                  >
                    {picked.has(String(selectedCard.tokenId))
                      ? "Deselect"
                      : "Add to selection"}
                  </Button>

                  {!selectedCard.claimed && (
                      <ListForSale tokenId={selectedCard.tokenId} />
                    )}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </PageShell>
  )
}
