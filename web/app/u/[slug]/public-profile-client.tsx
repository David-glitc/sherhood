"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAccount, useReadContract } from "wagmi"
import { toast } from "sonner"
import { PageShell } from "@/components/layout/page-shell"
import { UserAvatar } from "@/components/profile/user-avatar"
import { SendAssetsPanel } from "@/components/send/send-assets-panel"
import { ShareButton } from "@/components/share/share-button"
import { Tip } from "@/components/ui/tip"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WalletButton } from "@/components/layout/wallet-button"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { OpenSeaLink } from "@/components/share/opensea-link"
import { OPENSEA_COLLECTION_URL } from "@/lib/protocol"
import { ExternalLink } from "lucide-react"
import { OfferDialog } from "@/components/profile/offer-dialog"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { useOwnerCards } from "@/hooks/use-my-cards"
import { useMarketplaceTrade } from "@/hooks/use-marketplace"
import { marketplaceConfig } from "@/lib/contracts"
import { computeDerivedShare, shareToPct } from "@/lib/derived-value"
import {
  effectiveRarityIndex,
  fmtUsdg,
  holdingsLabel,
  ownershipPct,
  usdgToDollars,
} from "@/hooks/use-pots"
import { basketName } from "@/lib/basket-name"
import { profilePath, type PublicUserProfile } from "@/lib/user-profile"
import { cn } from "@/lib/utils"
import { robinhood } from "@/lib/chain"
import { useStockPrices } from "@/hooks/use-stock-prices"
import { BuyShrhButton } from "@/components/tokens/buy-shrh-dialog"

type ListingInfo = { price: bigint; active: boolean; seller: string }

export function PublicProfileClient() {
  const params = useParams<{ slug: string }>()
  const raw = (params.slug || "").trim()
  const { address: wallet, isConnected } = useAccount()
  const { buy, isPending: tradePending } = useMarketplaceTrade()

  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [walletAddr, setWalletAddr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [stats, setStats] = useState<{
    xp: number
    streak: number
    rank: number | null
    createdPots: string[]
  } | null>(null)
  const [offerFor, setOfferFor] = useState<{
    tokenId: bigint
    sealed: boolean
    listPriceFmt?: string
  } | null>(null)

  useEffect(() => {
    if (!raw) {
      setLoading(false)
      setMissing(true)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/profiles?slug=${encodeURIComponent(raw)}&public=1`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (r.status === 404) {
          setMissing(true)
          setProfile(null)
          setWalletAddr(null)
          return
        }
        const json = (await r.json()) as {
          profile?: PublicUserProfile
          wallet?: string
        }
        if (!json.profile) {
          setMissing(true)
          setProfile(null)
          setWalletAddr(null)
          return
        }
        setMissing(false)
        setProfile(json.profile)
        setWalletAddr(
          (json.wallet || json.profile.address || "").toLowerCase() || null
        )
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [raw])

  const owner = walletAddr
  const { cards, potInfo, isLoading: cardsLoading } = useOwnerCards(owner)

  useEffect(() => {
    if (!owner) {
      setStats(null)
      return
    }
    const controller = new AbortController()
    fetch(`/api/profile/${owner}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { xp?: number; streak?: number; rank?: number | null; createdPots?: string[] } | null) => {
        if (!json) return
        setStats({
          xp: json.xp ?? 0,
          streak: json.streak ?? 0,
          rank: json.rank ?? null,
          createdPots: json.createdPots ?? [],
        })
      })
      .catch(() => setStats(null))
    return () => controller.abort()
  }, [owner])

  const marketLive =
    marketplaceConfig.address !== "0x0000000000000000000000000000000000000000"

  const { data: listingsData } = useReadContract({
    ...marketplaceConfig,
    functionName: "getActiveListings",
    args: [],
    query: { enabled: marketLive },
  })

  const listingsById = useMemo(() => {
    const map = new Map<string, ListingInfo>()
    if (!listingsData) return map
    const raw = listingsData as [
      bigint[],
      { seller: string; price: bigint; active: boolean }[],
    ]
    const ids = Array.isArray(raw[0]) ? raw[0] : []
    ids.forEach((id, i) => {
      const row = raw[1]?.[i]
      if (!row?.active) return
      map.set(String(id), {
        price: row.price,
        active: row.active,
        seller: row.seller.toLowerCase(),
      })
    })
    return map
  }, [listingsData])

  const activeCards = useMemo(() => cards.filter((c) => !c.claimed), [cards])

  const holdingsBySymbol = useMemo(() => {
    const map = new Map<string, bigint>()
    for (const card of activeCards) {
      if (!card.revealed) continue
      const info = potInfo.get(card.pot.toLowerCase())
      if (!info) continue
      for (const h of info.holdings) {
        const payout = (h.amount * card.ownershipWeight) / 10n ** 18n
        map.set(h.symbol, (map.get(h.symbol) ?? 0n) + payout)
      }
    }
    return Array.from(map.entries())
  }, [activeCards, potInfo])

  const holdingSymbols = useMemo(
    () => holdingsBySymbol.map(([s]) => s),
    [holdingsBySymbol]
  )
  const { quotes } = useStockPrices(holdingSymbols)

  const portfolio = useMemo(() => {
    const sealed = activeCards
      .filter((c) => !c.revealed)
      .reduce((sum, c) => sum + usdgToDollars(c.depositAmount), 0)
    let revealed = 0
    let dayDelta = 0
    for (const [symbol, amount] of holdingsBySymbol) {
      const q = quotes[symbol]
      if (!q?.price) continue
      const value = (Number(amount) / 1e18) * q.price
      revealed += value
      dayDelta += value * ((q.changePct ?? 0) / 100)
    }
    const mark = sealed + revealed
    const cost = activeCards.reduce((sum, c) => sum + usdgToDollars(c.depositAmount), 0)
    return { mark, dayDelta, pnl: mark - cost }
  }, [activeCards, holdingsBySymbol, quotes])

  const stackCards = useMemo(() => activeCards.slice(0, 5), [activeCards])

  const listed = useMemo(
    () =>
      activeCards.filter((c) => {
        const L = listingsById.get(String(c.tokenId))
        return L?.active && owner && L.seller === owner
      }),
    [activeCards, listingsById, owner]
  )

  const unlistedSealed = useMemo(
    () =>
      activeCards.filter(
        (c) => !c.revealed && !listingsById.get(String(c.tokenId))?.active
      ),
    [activeCards, listingsById]
  )

  const unlistedRevealed = useMemo(
    () =>
      activeCards.filter(
        (c) => c.revealed && !listingsById.get(String(c.tokenId))?.active
      ),
    [activeCards, listingsById]
  )

  const isSelf =
    !!wallet && !!owner && wallet.toLowerCase() === owner.toLowerCase()
  const explorer = robinhood.blockExplorers.default.url
  const sharePath = profile ? profilePath(profile) : `/u/${raw}`

  const onBuy = async (tokenId: bigint, price: bigint) => {
    if (!isConnected) {
      toast.error("Connect wallet to buy")
      return
    }
    if (isSelf) {
      toast.error("That’s your listing")
      return
    }
    await buy(tokenId, price)
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="mt-4 h-8 w-48" />
      </PageShell>
    )
  }

  if (missing || !profile) {
    return (
      <PageShell narrow>
        <h1 className="text-2xl font-semibold">Not found</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/people" className={buttonVariants({ variant: "outline" })}>
            People
          </Link>
          <Link href="/profile" className={buttonVariants()}>
            Set up profile
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/people" className="text-sm text-muted-foreground hover:text-[#ccff00]">
          ← People
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <BuyShrhButton />
          <a
            href={OPENSEA_COLLECTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            OpenSea
          </a>
          <ShareButton
            path={sharePath}
            title={`${profile.name} on Sherhood`}
            text={`Check out ${profile.name} on Sherhood`}
            label="Share"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070707] p-4 sm:p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(204,255,0,0.1),transparent_55%)]"
          />
          <div className="relative flex flex-wrap items-center gap-4 sm:gap-6">
            <UserAvatar
              address={profile.address || owner || undefined}
              avatarId={profile.avatarId}
              name={profile.name}
              size={64}
              className="ring-2 ring-[#ccff00]/20"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                {profile.name}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">@{profile.slug}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-white/60">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  {activeCards.length} Sherds
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  {listed.length} listed
                </span>
                {stats ? (
                  <>
                    <Link
                      href="/leaderboard"
                      className="rounded-full border border-[#ccff00]/25 bg-[#ccff00]/10 px-2.5 py-1 text-[#ccff00] transition hover:bg-[#ccff00]/15"
                    >
                      {stats.rank != null ? `#${stats.rank}` : "Unranked"} · {stats.xp} XP
                    </Link>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                      {stats.streak}d streak
                    </span>
                  </>
                ) : null}
                {!cardsLoading && activeCards.length > 0 ? (
                  <>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 tabular-nums">
                      Mark ${portfolio.mark.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 tabular-nums",
                        portfolio.dayDelta >= 0
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          : "border-red-400/25 bg-red-400/10 text-red-300"
                      )}
                    >
                      Today {portfolio.dayDelta >= 0 ? "+" : ""}
                      ${portfolio.dayDelta.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {stackCards.length > 0 && (
              <div
                className="relative ml-auto hidden h-[7.5rem] w-[8.5rem] shrink-0 sm:block sm:h-36 sm:w-44"
                aria-hidden
              >
                {stackCards.map((card, i) => {
                  const rarityIdx = effectiveRarityIndex(
                    card.revealed,
                    card.rarity,
                    card.ownershipWeight
                  )
                  const n = stackCards.length
                  const offset = i - (n - 1) / 2
                  return (
                    <div
                      key={String(card.tokenId)}
                      className="absolute bottom-0 left-1/2 w-[4.6rem] sm:w-[5.4rem]"
                      style={{
                        zIndex: i + 1,
                        transform: `translateX(calc(-50% + ${offset * 18}px)) translateY(${Math.abs(offset) * 2}px) rotate(${offset * 7}deg)`,
                      }}
                    >
                      <PotNftCard
                        rarityIndex={rarityIdx}
                        revealed={card.revealed}
                        size="fill"
                        interactive={false}
                        tilt={false}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            {profile.allowReceive ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ccff00]/35 bg-[#ccff00]/10 px-3 py-1 text-xs font-medium text-[#ccff00]">
                Receives
                <Tip text="Wallet is visible for sends" />
              </span>
            ) : (
              <span className="rounded-full border border-[#333333] px-3 py-1 text-xs text-muted-foreground">
                Private receive
              </span>
            )}
            {isSelf && (
              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Edit
              </Link>
            )}
            {profile.allowReceive && profile.address && (
              <a
                href={`${explorer}/address/${profile.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                title={profile.address}
              >
                Explorer
              </a>
            )}
          </div>
        </section>

        {/* Send / connect gate */}
        {!isConnected ? (
          <aside className="product-surface flex flex-col justify-center gap-4 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Connect to interact</h2>
            <p className="text-sm text-muted-foreground">
              Connect your wallet and set a profile to send assets, buy listed Sherds, or place
              offers.
            </p>
            <WalletButton />
            <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
              Get your own profile
            </Link>
          </aside>
        ) : profile.allowReceive && profile.address ? (
          <SendAssetsPanel
            recipient={{
              address: profile.address,
              name: profile.name,
              avatarId: profile.avatarId,
              slug: profile.slug,
            }}
          />
        ) : (
          <aside className="product-surface flex flex-col justify-center gap-3 p-5 text-sm text-muted-foreground">
            <p>Sends locked — this player has receive off.</p>
            <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Your profile
            </Link>
          </aside>
        )}
      </div>

      {stats && stats.createdPots.length > 0 ? (
        <section className="mt-6" aria-label="Created pools">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/45">
            Pools created
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.createdPots.map((pot) => (
              <li key={pot}>
                <Link
                  href={`/pools/${pot}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#070707] px-4 py-3 text-sm transition hover:border-[#ccff00]/35"
                >
                  <span className="truncate font-medium text-white">{basketName(pot)}</span>
                  <span className="shrink-0 text-xs text-white/40">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Inventory */}
      <section className="mt-6 space-y-6" aria-label="Sherds">
        {cardsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-[112px] rounded-xl" />
            ))}
          </div>
        ) : activeCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            No Sherds in this wallet yet.
          </div>
        ) : (
          <>
            <CardSection
              title="Listed"
              empty="No active listings."
              count={listed.length}
            >
              {listed.map((card) => {
                const L = listingsById.get(String(card.tokenId))!
                return (
                  <ProfileCardTile
                    key={String(card.tokenId)}
                    card={card}
                    potInfo={potInfo}
                    listPrice={L.price}
                    onBuy={() => onBuy(card.tokenId, L.price)}
                    onOffer={() =>
                      setOfferFor({
                        tokenId: card.tokenId,
                        sealed: !card.revealed,
                        listPriceFmt: fmtUsdg(L.price),
                      })
                    }
                    buyDisabled={!isConnected || isSelf || tradePending}
                    offerDisabled={isSelf}
                    showBuy
                  />
                )
              })}
            </CardSection>

            <CardSection
              title="Sealed"
              empty="No sealed Sherds."
              count={unlistedSealed.length}
            >
              {unlistedSealed.map((card) => (
                <ProfileCardTile
                  key={String(card.tokenId)}
                  card={card}
                  potInfo={potInfo}
                  onOffer={() =>
                    setOfferFor({
                      tokenId: card.tokenId,
                      sealed: true,
                    })
                  }
                  offerDisabled={isSelf || !isConnected}
                  showBuy={false}
                />
              ))}
            </CardSection>

            <CardSection
              title="Revealed"
              empty="No revealed unlisted Sherds."
              count={unlistedRevealed.length}
            >
              {unlistedRevealed.map((card) => (
                <ProfileCardTile
                  key={String(card.tokenId)}
                  card={card}
                  potInfo={potInfo}
                  onOffer={() =>
                    setOfferFor({
                      tokenId: card.tokenId,
                      sealed: false,
                    })
                  }
                  offerDisabled={isSelf || !isConnected}
                  showBuy={false}
                />
              ))}
            </CardSection>
          </>
        )}
      </section>

      {offerFor && owner && (
        <OfferDialog
          open={Boolean(offerFor)}
          onOpenChange={(open) => {
            if (!open) setOfferFor(null)
          }}
          tokenId={offerFor.tokenId}
          seller={owner}
          listPriceFmt={offerFor.listPriceFmt}
          sealed={offerFor.sealed}
        />
      )}
    </PageShell>
  )
}

function CardSection({
  title,
  empty,
  count,
  children,
}: {
  title: string
  empty: string
  count: number
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {children}
        </div>
      )}
    </div>
  )
}

function ProfileCardTile({
  card,
  potInfo,
  listPrice,
  onBuy,
  onOffer,
  buyDisabled,
  offerDisabled,
  showBuy,
}: {
  card: {
    tokenId: bigint
    pot: `0x${string}`
    depositAmount: bigint
    ownershipWeight: bigint
    rarity: number
    revealed: boolean
    claimed: boolean
  }
  potInfo: ReturnType<typeof useOwnerCards>["potInfo"]
  listPrice?: bigint
  onBuy?: () => void
  onOffer?: () => void
  buyDisabled?: boolean
  offerDisabled?: boolean
  showBuy: boolean
}) {
  const info = potInfo.get(card.pot.toLowerCase())
  const rarityIdx = effectiveRarityIndex(
    card.revealed,
    card.rarity,
    card.ownershipWeight
  )
  const share = computeDerivedShare({
    depositAmount: card.depositAmount,
    totalDeposited: info?.totalDeposited ?? 0n,
    ownershipWeight: card.ownershipWeight,
    revealed: card.revealed,
    claimed: card.claimed,
  })
  const label =
    info && info.holdings.length > 0
      ? holdingsLabel(info.holdings)
      : basketName(card.pot)

  return (
    <div className="group relative min-w-0">
      <Link
        href={`/sherds/${card.tokenId}`}
        className="relative block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50"
      >
        <div className="absolute left-2 top-2 z-20">
          <CardStateBadge revealed={card.revealed} claimed={card.claimed} />
        </div>
        {info && info.holdings.length > 0 && (
          <div className="absolute right-2 top-2 z-20">
            <StockLogoStack
              symbols={info.holdings.map((h) => h.symbol)}
              size={16}
              max={3}
            />
          </div>
        )}
        <PotNftCard
          rarityIndex={rarityIdx}
          revealed={card.revealed}
          tokenId={card.tokenId}
          stockLabel={label}
          ownershipPct={
            card.revealed
              ? ownershipPct(card.ownershipWeight)
              : shareToPct(share)
          }
          size="fill"
          interactive
          tilt
        />
      </Link>
      {listPrice != null && (
        <p className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-white">
          ${fmtUsdg(listPrice)} <UsdgLogo size={12} />
        </p>
      )}
      <div className="mt-2 flex flex-col gap-1.5">
        {showBuy && onBuy ? (
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={buyDisabled}
            onClick={onBuy}
          >
            Buy
          </Button>
        ) : null}
        {onOffer ? (
          <Button
            type="button"
            size="sm"
            variant={showBuy ? "outline" : "default"}
            className="w-full"
            disabled={offerDisabled}
            onClick={onOffer}
          >
            Make offer
          </Button>
        ) : null}
        <OpenSeaLink tokenId={card.tokenId} compact className="w-full" />
      </div>
    </div>
  )
}
