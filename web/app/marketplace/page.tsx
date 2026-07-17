"use client"

import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { marketplaceConfig, potCardConfig, potAbi } from "@/lib/contracts"
import { useMarketplaceTrade } from "@/hooks/use-marketplace"
import { fmtUsdg, holdingsLabel, ownershipPct, parseHoldings, RARITIES } from "@/hooks/use-pots"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { Button, buttonVariants } from "@/components/ui/button"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { computeDerivedShare, shareToPct } from "@/lib/derived-value"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useMemo } from "react"

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const { buy, cancel, isPending } = useMarketplaceTrade()

  const zero =
    marketplaceConfig.address === "0x0000000000000000000000000000000000000000"

  const { data: listingsData, isLoading } = useReadContract({
    ...marketplaceConfig,
    functionName: "getActiveListings",
    args: [],
    query: { enabled: !zero },
  })

  const { data: royaltyBps } = useReadContract({
    ...marketplaceConfig,
    functionName: "royaltyBps",
    args: [],
    query: { enabled: !zero },
  })

  const tokenIds = useMemo(() => {
    if (!listingsData) return [] as bigint[]
    const raw = listingsData as [bigint[], { seller: string; price: bigint; active: boolean }[]]
    return Array.isArray(raw[0]) ? raw[0] : []
  }, [listingsData])

  const items = useMemo(() => {
    if (!listingsData) return [] as { seller: `0x${string}`; price: bigint; active: boolean }[]
    const raw = listingsData as [bigint[], { seller: string; price: bigint; active: boolean }[]]
    return (raw[1] ?? []).map((x) => ({
      seller: x.seller as `0x${string}`,
      price: x.price,
      active: x.active,
    }))
  }, [listingsData])

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

  const { data: potTotals } = useReadContracts({
    contracts: pots.filter(Boolean).map((pot) => ({
      address: pot!,
      abi: potAbi,
      functionName: "totalDeposited",
    })),
    query: { enabled: pots.some(Boolean) },
  })

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Secondary market"
        title="Trade cards"
        description={`Buy fixed-price listings in USDG. Every card shows its state and derived share before purchase.${royaltyBps !== undefined ? ` Protocol royalty: ${Number(royaltyBps) / 100}%.` : ""}`}
        actions={
          <>
          <Link
            href="/app"
            className={buttonVariants({ variant: "outline" })}
          >
            Browse baskets
          </Link>
          <Link
            href="/docs/secondary-market"
            className={buttonVariants({ variant: "ghost" })}
          >
            Trading rules
          </Link>
          </>
        }
      />

      {zero && (
        <div className="product-surface p-5" role="status">
          <h2 className="font-semibold">Trading is not configured</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cards still mint from baskets, but the marketplace address has not been set.
          </p>
        </div>
      )}

      {!zero && isLoading && (
        <div className="responsive-grid" aria-label="Loading listings">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="product-surface flex flex-col gap-4 p-4">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      )}

      {!zero && !isLoading && tokenIds.length === 0 && (
        <div className="product-surface p-6 sm:p-10">
          <h2 className="text-xl font-semibold">No active listings</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Fund a basket to mint a card, then list it from your inventory.
          </p>
          <Link href="/app" className={cn(buttonVariants(), "mt-5")}>
            Browse baskets
          </Link>
        </div>
      )}

      <div className="responsive-grid">
        {tokenIds.map((id, i) => {
          const item = items[i]
          if (!item?.active) return null
          const cardRaw = cards?.[i]?.status === "success" ? cards[i].result : null
          const depositAmount = cardRaw
            ? (Array.isArray(cardRaw)
                ? (cardRaw[1] as bigint)
                : (cardRaw as { depositAmount: bigint }).depositAmount)
            : 0n
          const ownershipWeight = cardRaw
            ? (Array.isArray(cardRaw)
                ? (cardRaw[2] as bigint)
                : (cardRaw as { ownershipWeight: bigint }).ownershipWeight)
            : 0n
          const rarityIdx = cardRaw
            ? Number(Array.isArray(cardRaw) ? cardRaw[3] : (cardRaw as { rarity: number }).rarity)
            : 0
          const revealed = cardRaw
            ? Boolean(
                Array.isArray(cardRaw) ? cardRaw[4] : (cardRaw as { revealed: boolean }).revealed
              )
            : false
          const claimed = cardRaw
            ? Boolean(
                Array.isArray(cardRaw) ? cardRaw[5] : (cardRaw as { claimed: boolean }).claimed
              )
            : false
          const holdingIdx = pots.slice(0, i + 1).filter(Boolean).length - 1
          const holdingsRaw =
            holdingsBatches?.[holdingIdx]?.status === "success"
              ? (holdingsBatches[holdingIdx].result as [string[], bigint[]])
              : undefined
          const holdings = parseHoldings(
            holdingsRaw?.[0] as `0x${string}`[] | undefined,
            holdingsRaw?.[1]
          )
          const totalDeposited =
            potTotals?.[holdingIdx]?.status === "success"
              ? (potTotals[holdingIdx].result as bigint)
              : 0n
          const share = computeDerivedShare({
            depositAmount,
            totalDeposited,
            ownershipWeight,
            revealed,
            claimed,
          })
          const basketLabel = holdingsLabel(holdings)
          const isMine =
            isConnected && address && item.seller.toLowerCase() === address.toLowerCase()

          return (
            <div
              key={String(id)}
              className="product-surface min-w-0 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <CardStateBadge revealed={revealed} claimed={claimed} />
                {holdings.length > 0 && (
                  <StockLogoStack
                    symbols={holdings.map((h) => h.symbol)}
                    size={22}
                    max={4}
                  />
                )}
              </div>
              <PotNftCard
                rarityIndex={rarityIdx}
                revealed={revealed}
                tokenId={id}
                stockLabel={holdings.length > 0 ? `${basketLabel} basket` : "Multi-stock basket"}
                ownershipPct={revealed ? `${ownershipPct(ownershipWeight)}%` : undefined}
                size="md"
              />
              <p className="mt-4 text-xl font-semibold">
                <span className="inline-flex items-center gap-1">
                  {fmtUsdg(item.price)} <UsdgLogo size={16} />
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {revealed ? "Ownership" : "Fair share"}{" "}
                <span className="font-medium text-[#e5e7eb]">{shareToPct(share)}%</span>
              </p>
              <p className="mt-2 truncate font-mono text-xs text-muted-foreground" title={item.seller}>{item.seller}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {RARITIES[rarityIdx] ?? "Card"}
              </p>

              {isMine ? (
                <Button
                  className="mt-4 w-full rounded-full border border-white/15"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => cancel(id)}
                >
                  Cancel listing
                </Button>
              ) : (
                <Button
                  className="mt-4 w-full rounded-[14px] bg-sherhood font-semibold text-black hover:brightness-110"
                  disabled={!isConnected || isPending}
                  onClick={() => buy(id, item.price)}
                >
                  {!isConnected ? "Connect" : isPending ? "Buying…" : "Buy card"}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
