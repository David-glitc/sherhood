"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAccount, useDisconnect, useReadContract } from "wagmi"
import { toast } from "sonner"
import { PageShell, PageHeader } from "@/components/layout/page-shell"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WalletButton } from "@/components/layout/wallet-button"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { StockLogo, StockLogoStack } from "@/components/stocks/stock-logo"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { PortfolioChart, type TimelinePoint } from "@/components/profile/portfolio-chart"
import { useMyCards } from "@/hooks/use-my-cards"
import { useMarketplaceTrade } from "@/hooks/use-marketplace"
import { marketplaceConfig } from "@/lib/contracts"
import { computeDerivedShare, shareToPct } from "@/lib/derived-value"
import { fmtUsdg, holdingsLabel, ownershipPct, POT_STATUSES, RARITIES } from "@/hooks/use-pots"
import { cn } from "@/lib/utils"

type ProfileActivityItem = {
  kind: "deposit" | "claim" | "early_exit" | "create" | "buy" | "sell" | "list" | "delist"
  at: number
  pot?: string
  tokenId?: string
  amount?: string
  xp: number
}

type ProfilePayload = {
  activity: ProfileActivityItem[]
  xp: number
  streak: number
  actions: number
  timeline: TimelinePoint[]
}

const ACTIVITY_LABEL: Record<ProfileActivityItem["kind"], string> = {
  deposit: "Funded a basket",
  claim: "Claimed stock share",
  early_exit: "Exited during funding",
  create: "Created a basket",
  buy: "Bought a card",
  sell: "Sold a card",
  list: "Listed a card",
  delist: "Cancelled a listing",
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function timeAgo(at: number): string {
  const diff = Date.now() / 1000 - at
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86_400)}d ago`
}

function clearInterfaceData() {
  if (typeof window === "undefined") return

  const shouldDrop = (key: string) => {
    const k = key.toLowerCase()
    return (
      k.includes("wagmi") ||
      k.includes("rainbow") ||
      k.includes("rk-") ||
      k.includes("walletconnect") ||
      k.includes("wc@") ||
      k.includes("sherhood") ||
      k.includes("recentlyused")
    )
  }

  try {
    const lsKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) lsKeys.push(key)
    }
    for (const key of lsKeys) {
      if (shouldDrop(key)) localStorage.removeItem(key)
    }
  } catch {
    /* ignore quota / private mode */
  }

  try {
    sessionStorage.clear()
  } catch {
    /* ignore */
  }

  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim()
      if (!name) return
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })
  } catch {
    /* ignore */
  }
}

function StatTile({
  label,
  value,
  hint,
  loading,
}: {
  label: string
  value: string
  hint?: string
  loading?: boolean
}) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-2 truncate text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
          {value}
        </p>
      )}
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { cards, potInfo, isLoading: cardsLoading } = useMyCards()
  const { cancel, isPending: cancelPending } = useMarketplaceTrade()

  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [profileFailed, setProfileFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!address) return
    const controller = new AbortController()
    fetch(`/api/profile/${address}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: ProfilePayload) => {
        setProfile(json)
        setProfileFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileFailed(true)
      })
    return () => controller.abort()
  }, [address])

  const marketplaceLive =
    marketplaceConfig.address !== "0x0000000000000000000000000000000000000000"

  const { data: listingsData } = useReadContract({
    ...marketplaceConfig,
    functionName: "getActiveListings",
    args: [],
    query: { enabled: isConnected && marketplaceLive },
  })

  const myListings = useMemo(() => {
    if (!listingsData || !address) return []
    const raw = listingsData as [bigint[], { seller: string; price: bigint; active: boolean }[]]
    const ids = Array.isArray(raw[0]) ? raw[0] : []
    return ids
      .map((tokenId, i) => ({ tokenId, ...raw[1][i] }))
      .filter(
        (l) => l.active && l.seller.toLowerCase() === address.toLowerCase()
      )
  }, [listingsData, address])

  const activeCards = useMemo(() => cards.filter((c) => !c.claimed), [cards])

  const totalDeposited = useMemo(
    () => activeCards.reduce((sum, c) => sum + c.depositAmount, 0n),
    [activeCards]
  )

  // Aggregate stock amounts across revealed unclaimed cards: share × pot holdings.
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
    return Array.from(map.entries()).sort((a, b) => (b[1] > a[1] ? 1 : -1))
  }, [activeCards, potInfo])

  // Group active cards by pot for the deposited-pools table.
  const myPools = useMemo(() => {
    const map = new Map<
      string,
      { pot: `0x${string}`; deposited: bigint; cardCount: number }
    >()
    for (const card of activeCards) {
      const key = card.pot.toLowerCase()
      const entry = map.get(key) ?? { pot: card.pot, deposited: 0n, cardCount: 0 }
      entry.deposited += card.depositAmount
      entry.cardCount += 1
      map.set(key, entry)
    }
    return Array.from(map.values())
  }, [activeCards])

  const onDelete = async () => {
    const ok = window.confirm(
      "Delete local Sherhood account data in this browser?\n\nThis disconnects your wallet here and clears interface storage. On-chain deposits, cards, and trades cannot be deleted."
    )
    if (!ok) return

    setPending(true)
    try {
      disconnect()
      clearInterfaceData()
      setDone(true)
      toast.success("Local account data cleared")
    } catch {
      toast.error("Could not clear all local data")
    } finally {
      setPending(false)
    }
  }

  if (!isConnected || !address) {
    return (
      <PageShell narrow>
        <PageHeader
          eyebrow="Account"
          title="Profile"
          description="Connect a wallet to see your portfolio, cards, listings, activity, XP, and streak."
        />
        <div className="product-surface p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Wallet required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your dashboard is built from on-chain activity. Connect a wallet to load it.
          </p>
          <div className="mt-5">
            <WalletButton />
          </div>
        </div>
      </PageShell>
    )
  }

  const statsLoading = !profile && !profileFailed

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Account"
        title="Your dashboard"
        description="Portfolio, cards, listings, pools, and full activity for the connected wallet."
        actions={
          <>
            <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground">
              {shortAddr(address)}
            </span>
            <WalletButton />
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Top stats */}
        <section aria-label="Account totals" className="product-surface-subtle overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
            <StatTile
              label="Deposited (active)"
              value={`${fmtUsdg(totalDeposited)} USDG`}
              hint={`${myPools.length} pool${myPools.length === 1 ? "" : "s"}`}
              loading={cardsLoading}
            />
            <StatTile
              label="Cards"
              value={String(activeCards.length)}
              hint={`${activeCards.filter((c) => c.revealed).length} revealed · ${activeCards.filter((c) => !c.revealed).length} sealed`}
              loading={cardsLoading}
            />
            <StatTile
              label="XP"
              value={profileFailed ? "—" : String(profile?.xp ?? 0)}
              hint={`${profile?.actions ?? 0} scored actions`}
              loading={statsLoading}
            />
            <StatTile
              label="Streak"
              value={profileFailed ? "—" : `${profile?.streak ?? 0} day${(profile?.streak ?? 0) === 1 ? "" : "s"}`}
              hint="Consecutive active days"
              loading={statsLoading}
            />
          </div>
        </section>

        {/* Portfolio chart */}
        <section className="product-surface p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Portfolio over time</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Net USDG principal in baskets after deposits, exits, and claims.
              </p>
            </div>
            <Link href="/leaderboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              View leaderboard
            </Link>
          </div>
          {statsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : profileFailed ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Portfolio history is temporarily unavailable.
            </div>
          ) : (
            <PortfolioChart timeline={profile?.timeline ?? []} />
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Asset holdings */}
          <section className="product-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Asset holdings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stock amounts claimable from your revealed cards.
            </p>
            {cardsLoading ? (
              <div className="mt-4 flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : holdingsBySymbol.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No claimable stock yet. Holdings appear here once a basket you funded reveals.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {holdingsBySymbol.map(([symbol, amount]) => (
                  <li key={symbol} className="flex items-center justify-between gap-3 py-3">
                    <StockLogo symbol={symbol} size={28} showSymbol />
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {(Number(amount) / 1e18).toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Deposited pools */}
          <section className="product-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Your pools</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Baskets holding your active deposits.
            </p>
            {cardsLoading ? (
              <div className="mt-4 flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : myPools.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border p-4">
                <p className="text-sm text-muted-foreground">No active deposits.</p>
                <Link href="/app" className={cn(buttonVariants({ size: "sm" }), "mt-3")}>
                  Browse baskets
                </Link>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {myPools.map((pool) => {
                  const info = potInfo.get(pool.pot.toLowerCase())
                  return (
                    <li key={pool.pot}>
                      <Link
                        href={`/basket/${pool.pot}`}
                        className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {info && info.holdings.length > 0
                              ? `${holdingsLabel(info.holdings)} basket`
                              : `Basket ${shortAddr(pool.pot)}`}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {POT_STATUSES[info?.status ?? -1] ?? "Unknown"} · {pool.cardCount} card
                            {pool.cardCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-sm tabular-nums text-foreground">
                          {fmtUsdg(pool.deposited)} <UsdgLogo size={13} />
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Cards */}
        <section className="product-surface p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your cards</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sealed and revealed cards owned by this wallet.
              </p>
            </div>
            <Link href="/inventory" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Manage in inventory
            </Link>
          </div>
          {cardsLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
              ))}
            </div>
          ) : activeCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No cards yet. Fund an open basket to receive your first sealed card.
              </p>
              <Link href="/app" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
                Explore baskets
              </Link>
            </div>
          ) : (
            <div className="scroll-mask-x -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
              {activeCards.map((card) => {
                const info = potInfo.get(card.pot.toLowerCase())
                const share = computeDerivedShare({
                  depositAmount: card.depositAmount,
                  totalDeposited: info?.totalDeposited ?? 0n,
                  ownershipWeight: card.ownershipWeight,
                  revealed: card.revealed,
                  claimed: card.claimed,
                })
                return (
                  <div key={String(card.tokenId)} className="w-44 shrink-0 sm:w-52">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <CardStateBadge revealed={card.revealed} claimed={card.claimed} />
                      {info && info.holdings.length > 0 && (
                        <StockLogoStack
                          symbols={info.holdings.map((h) => h.symbol)}
                          size={18}
                          max={3}
                        />
                      )}
                    </div>
                    <PotNftCard
                      rarityIndex={card.rarity}
                      revealed={card.revealed}
                      tokenId={card.tokenId}
                      ownershipPct={
                        card.revealed ? `${ownershipPct(card.ownershipWeight)}%` : undefined
                      }
                      size="sm"
                      interactive={false}
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{RARITIES[card.rarity] ?? "Card"}</span>
                      <span className="tabular-nums">{shareToPct(share)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Listings */}
        <section className="product-surface p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Active listings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cards you listed on Trade. Listed cards are locked until sold or cancelled.
              </p>
            </div>
            <Link href="/marketplace" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open Trade
            </Link>
          </div>
          {!marketplaceLive ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Trading is not configured yet.
            </p>
          ) : myListings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No active listings. List a card from your inventory to sell it for USDG.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {myListings.map((listing) => (
                <li
                  key={String(listing.tokenId)}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Card #{String(listing.tokenId)}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      Ask {fmtUsdg(listing.price)} <UsdgLogo size={12} />
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelPending}
                    onClick={() => cancel(listing.tokenId)}
                  >
                    {cancelPending ? "Cancelling…" : "Cancel listing"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activity history */}
        <section className="product-surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent on-chain actions for this wallet, with XP earned.
          </p>
          {statsLoading ? (
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : profileFailed ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Activity history is temporarily unavailable. Reload to try again.
            </p>
          ) : (profile?.activity.length ?? 0) === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No recorded activity in the recent window. Fund a basket to start earning XP.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {profile!.activity.slice(0, 25).map((item, i) => (
                <li
                  key={`${item.kind}-${item.at}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {ACTIVITY_LABEL[item.kind]}
                      {item.tokenId ? (
                        <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                          #{item.tokenId}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {timeAgo(item.at)}
                      {item.amount && BigInt(item.amount) > 0n
                        ? ` · ${fmtUsdg(BigInt(item.amount))} USDG`
                        : ""}
                      {item.pot ? ` · ${shortAddr(item.pot)}` : ""}
                    </p>
                  </div>
                  {item.xp > 0 && (
                    <span className="shrink-0 rounded-md border border-primary/30 bg-primary/[0.08] px-2 py-0.5 text-xs font-semibold text-primary">
                      +{item.xp} XP
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Account management */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="product-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Wallet
            </p>
            <p className="mt-3 break-all font-mono text-sm text-foreground">{address}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Sherhood is experimental software. Review the{" "}
              <Link href="/legal/terms" className="text-primary underline-offset-4 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section className="product-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Browser data
            </p>
            <h2 className="mt-3 text-lg font-semibold text-foreground">Clear local account data</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Disconnects this wallet and clears interface storage in this browser.{" "}
              <strong className="font-medium text-foreground">Blockchain data is not deleted</strong>{" "}
              (baskets, cards, and trades stay on-chain and public).
            </p>
            <Button
              type="button"
              variant="destructive"
              className="mt-5 min-h-11 w-full sm:w-auto"
              disabled={pending}
              onClick={onDelete}
            >
              {pending ? "Clearing data…" : "Clear local data"}
            </Button>
            {done ? (
              <p className="mt-3 text-sm text-primary" role="status">
                Local browser data cleared.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </PageShell>
  )
}
