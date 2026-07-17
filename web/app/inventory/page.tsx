"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potFactoryConfig, potCardConfig, potAbi, marketplaceConfig } from "@/lib/contracts"
import { useClaimCard } from "@/hooks/use-claim-card"
import { useMarketplaceTrade } from "@/hooks/use-marketplace"
import { RARITIES, fmtUsdg, holdingsLabel, ownershipPct, parseHoldings } from "@/hooks/use-pots"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { ShrhLuckPill } from "@/components/layout/shrh-luck-pill"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { computeDerivedShare, shareToPct } from "@/lib/derived-value"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const RARITY_STYLE: Record<string, string> = {
  Unrevealed: "border-white/10",
  Common: "border-white/15",
  Rare: "border-sky-500/40",
  Epic: "border-violet-500/40",
  Legendary: "border-amber-400/50",
}

export default function InventoryPage() {
  const { address, isConnected } = useAccount()
  const { claim, isPending: claimPending } = useClaimCard()
  const { list, isPending: listPending } = useMarketplaceTrade()
  const [listPrices, setListPrices] = useState<Record<string, string>>({})

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
      const depositAmount = (Array.isArray(raw) ? raw[1] : (raw as { depositAmount: bigint }).depositAmount) as bigint
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

  if (!isConnected || !address) {
    return (
      <PageShell narrow>
        <PageHeader
          eyebrow="Inventory"
          title="Your cards"
          description="Connect a wallet to see the mystery and revealed ownership cards minted from your deposits."
        />
        <div className="product-surface p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Wallet required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect a wallet to see mystery and revealed ownership cards from baskets you funded.
        </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Inventory"
        title="Your cards"
        description="Cards mint when you fund a basket. Revealed cards show the exact ownership share available to claim."
        actions={
          <>
          <ShrhLuckPill />
          <Link href="/app" className={buttonVariants({ variant: "outline" })}>
            Fund a basket
          </Link>
          </>
        }
      />

      {cardsLoading ? (
        <div className="responsive-grid" aria-label="Loading cards">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="product-surface flex flex-col gap-4 p-4">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      ) : myCards.length === 0 ? (
        <div className="product-surface p-6 sm:p-10">
          <h2 className="text-xl font-semibold">No cards yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Fund an open basket to mint your first sealed ownership card.
          </p>
          <Link href="/app" className={cn(buttonVariants(), "mt-5")}>
            Browse baskets
          </Link>
        </div>
      ) : (
        <div className="responsive-grid">
          {myCards.map((card, idx) => {
            const rarity = RARITIES[card.rarity] ?? "Unrevealed"
            const holdingsRaw =
              potHoldings?.[idx]?.status === "success"
                ? (potHoldings[idx].result as [string[], bigint[]])
                : undefined
            const holdings = parseHoldings(
              holdingsRaw?.[0] as `0x${string}`[] | undefined,
              holdingsRaw?.[1]
            )
            const basketLabel = holdingsLabel(holdings)
            const potStatus =
              potStatuses?.[idx]?.status === "success" ? Number(potStatuses[idx].result) : -1
            const canClaim = card.revealed && !card.claimed && potStatus === 3
            const idKey = String(card.tokenId)
            const totalDeposited =
              potTotals?.[idx]?.status === "success"
                ? (potTotals[idx].result as bigint)
                : 0n
            const share = computeDerivedShare({
              depositAmount: card.depositAmount,
              totalDeposited,
              ownershipWeight: card.ownershipWeight,
              revealed: card.revealed,
              claimed: card.claimed,
            })

            return (
              <div
                key={idKey}
                className={cn("product-surface min-w-0 p-4", RARITY_STYLE[rarity])}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <CardStateBadge revealed={card.revealed} claimed={card.claimed} />
                  {holdings.length > 0 && (
                    <StockLogoStack
                      symbols={holdings.map((h) => h.symbol)}
                      size={22}
                      max={4}
                    />
                  )}
                </div>
                <PotNftCard
                  rarityIndex={card.rarity}
                  revealed={card.revealed}
                  tokenId={card.tokenId}
                  stockLabel={holdings.length > 0 ? `${basketLabel} basket` : "Multi-stock basket"}
                  ownershipPct={
                    card.revealed ? `${ownershipPct(card.ownershipWeight)}%` : undefined
                  }
                  size="md"
                />

                <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span className="text-xs uppercase tracking-wider text-white/30">{rarity}</span>
                    <span className="text-xs text-white/30">
                      Deposit {fmtUsdg(card.depositAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{card.revealed ? "Ownership" : "Fair share"}</span>
                    <span className="font-medium text-foreground">{shareToPct(share)}%</span>
                  </div>
                  {card.revealed && !card.claimed && holdings.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-border pt-2">
                      {holdings.map((h) => {
                        const payout =
                          (h.amount * card.ownershipWeight) / 10n ** 18n
                        const amount = Number(payout) / 1e18
                        return (
                          <div key={h.symbol} className="flex justify-between text-xs">
                            <span className="text-white/35">{h.symbol}</span>
                            <span className="tabular-nums text-foreground">
                              {amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {!card.revealed && (
                  <p className="mt-3 text-center text-xs text-white/35">Awaiting basket reveal</p>
                )}

                {canClaim && (
                  <Button
                    className="mt-4 w-full rounded-[14px] bg-sherhood font-semibold text-black hover:brightness-110"
                    disabled={claimPending}
                    onClick={() => claim(card.pot, card.tokenId)}
                  >
                    {claimPending ? "Claiming…" : "Claim asset share"}
                  </Button>
                )}

                {marketplaceConfig.address !==
                  "0x0000000000000000000000000000000000000000" && (
                  <div className="mt-3 space-y-2">
                    <label htmlFor={`list-price-${idKey}`} className="text-xs font-medium text-muted-foreground">
                      Listing price (USDG)
                    </label>
                    <input
                      id={`list-price-${idKey}`}
                      type="number"
                      min="0.000001"
                      step="any"
                      inputMode="decimal"
                      placeholder="100"
                      value={listPrices[idKey] ?? ""}
                      onChange={(e) =>
                        setListPrices((p) => ({ ...p, [idKey]: e.target.value }))
                      }
                      className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground transition-colors focus:border-primary"
                    />
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-white/15 text-white/80"
                      disabled={listPending || !listPrices[idKey]}
                      onClick={() => list(card.tokenId, listPrices[idKey])}
                    >
                      {listPending ? "Listing…" : "List on Trade"}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
