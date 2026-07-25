"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAccount, useDisconnect, useReadContract, useSignMessage } from "wagmi"
import { toast } from "sonner"
import { PageShell, PageHeader } from "@/components/layout/page-shell"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WalletButton } from "@/components/layout/wallet-button"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { PortfolioChart, type TimelinePoint } from "@/components/profile/portfolio-chart"
import { AllocationChart } from "@/components/profile/allocation-chart"
import { MarkCostChart } from "@/components/profile/mark-cost-chart"
import { ProfileIdentityEditor } from "@/components/profile/profile-identity-editor"
import { AccountSubnav } from "@/components/profile/account-subnav"
import { BuyShrhButton } from "@/components/tokens/buy-shrh-dialog"
import { WalletBalancesCard } from "@/components/profile/wallet-balances-card"
import { SharePnlButton } from "@/components/profile/share-pnl-button"
import { useFundBalances } from "@/hooks/use-fund-balances"
import { useEthUsd } from "@/hooks/use-eth-usd"
import { AddSherdsToWalletButton } from "@/components/wallet/add-sherds-to-wallet"
import { OPENSEA_COLLECTION_URL } from "@/lib/protocol"
import { ExternalLink, LogOut } from "lucide-react"
import { useMyCards } from "@/hooks/use-my-cards"
import { useProfiles } from "@/hooks/use-profiles"
import { useMarketplaceTrade } from "@/hooks/use-marketplace"
import { marketplaceConfig } from "@/lib/contracts"
import { computeDerivedShare, shareToPct } from "@/lib/derived-value"
import { fmtUsdg, holdingsLabel, ownershipPct, POT_STATUSES, RARITIES, effectiveRarityIndex, usdgToDollars } from "@/hooks/use-pots"
import { useStockPrices } from "@/hooks/use-stock-prices"
import { useSherdQuote } from "@/hooks/use-sherd-quote"
import { ClaimableStockRow } from "@/components/stocks/claimable-stock-row"
import { TradingViewSymbolTabs } from "@/components/stocks/tradingview-mini"
import { basketName } from "@/lib/basket-name"
import { profileDeleteMessage, profileStorageKey } from "@/lib/user-profile"
import { cn } from "@/lib/utils"

type ProfileActivityItem = {
  kind: "deposit" | "claim" | "early_exit" | "create" | "buy" | "sell" | "list" | "delist" | "reveal"
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
  createdPots?: string[]
  rank?: number | null
}

const ACTIVITY_LABEL: Record<ProfileActivityItem["kind"], string> = {
  deposit: "Funded a pool",
  claim: "Claimed stock share",
  early_exit: "Exited during funding",
  create: "Created a pool",
  buy: "Bought a card",
  sell: "Sold a card",
  list: "Listed a card",
  delist: "Cancelled a listing",
  reveal: "Revealed a Sherd",
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function symbolHashColor(symbol: string): string {
  const palette = ["#38bdf8", "#f472b6", "#fb923c", "#a78bfa", "#34d399", "#facc15"]
  let h = 0
  for (let i = 0; i < symbol.length; i++) h = (h + symbol.charCodeAt(i) * 17) % palette.length
  return palette[h]!
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
  valueClassName,
}: {
  label: string
  value: string
  hint?: string
  loading?: boolean
  valueClassName?: string
}) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.03] p-3 sm:p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p
          className={cn(
            "mt-1.5 break-words text-base font-bold leading-tight tabular-nums sm:text-lg",
            valueClassName ?? "text-foreground"
          )}
        >
          {value}
        </p>
      )}
      {hint && (
        <p className="mt-1 break-words text-[11px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { get: getProfile, upsertLocal } = useProfiles(address ? [address] : [])
  const mine = address ? getProfile(address) : null
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
      .then((json: ProfilePayload & { error?: string }) => {
        setProfile((prev) => {
          if (json.error && (json.xp ?? 0) === 0 && prev && prev.xp > 0) return prev
          return json
        })
        if (!(json.error && (json.xp ?? 0) === 0)) setProfileFailed(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setProfile((prev) => {
          if (!prev) setProfileFailed(true)
          return prev
        })
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

  // Cost basis = active deposits (USDG 6 or 18-dec). Mark = sealed at deposit + revealed at live NAV.
  const holdingSymbols = useMemo(
    () => holdingsBySymbol.map(([s]) => s),
    [holdingsBySymbol]
  )
  const { quotes, loading: pricesLoading } = useStockPrices(holdingSymbols)

  const sealedPrincipalUsd = useMemo(
    () =>
      activeCards
        .filter((c) => !c.revealed)
        .reduce((sum, c) => sum + usdgToDollars(c.depositAmount), 0),
    [activeCards]
  )

  const revealedMarkUsd = useMemo(() => {
    let total = 0
    for (const [symbol, amount] of holdingsBySymbol) {
      const price = quotes[symbol]?.price ?? 0
      if (!price) continue
      total += (Number(amount) / 1e18) * price
    }
    return total
  }, [holdingsBySymbol, quotes])

  const costBasisUsd = useMemo(
    () => activeCards.reduce((sum, c) => sum + usdgToDollars(c.depositAmount), 0),
    [activeCards]
  )
  const markUsd = revealedMarkUsd + sealedPrincipalUsd
  const pnlUsd = markUsd - costBasisUsd
  const pnlPct = costBasisUsd > 0 ? (pnlUsd / costBasisUsd) * 100 : 0
  const pricesNeeded = holdingsBySymbol.length > 0
  const pnlReady =
    !cardsLoading && (!pricesNeeded || (!pricesLoading && Object.keys(quotes).length > 0))
  const pnlTone =
    !pnlReady ? "text-foreground" : pnlUsd > 0.005 ? "text-[#ccff00]" : pnlUsd < -0.005 ? "text-red-400" : "text-foreground"

  const shareCardOptions = useMemo(() => {
    return activeCards.map((card) => {
      const cost = usdgToDollars(card.depositAmount)
      let mark = cost
      if (card.revealed) {
        const info = potInfo.get(card.pot.toLowerCase())
        mark = 0
        if (info) {
          for (const h of info.holdings) {
            const price = quotes[h.symbol]?.price ?? 0
            if (!price) continue
            const payout = Number((h.amount * card.ownershipWeight) / 10n ** 18n) / 1e18
            mark += payout * price
          }
        }
        if (mark === 0) mark = cost
      }
      return {
        tokenId: String(card.tokenId),
        label: `#${String(card.tokenId)}`,
        markUsd: mark,
        costUsd: cost,
        pnlUsd: mark - cost,
      }
    })
  }, [activeCards, potInfo, quotes])

  /** Session day move on revealed holdings from live changePct. */
  const dayMarkDeltaUsd = useMemo(() => {
    let delta = 0
    for (const [symbol, amount] of holdingsBySymbol) {
      const q = quotes[symbol]
      if (!q?.price) continue
      const value = (Number(amount) / 1e18) * q.price
      delta += value * ((q.changePct ?? 0) / 100)
    }
    return delta
  }, [holdingsBySymbol, quotes])

  const { eth, weth, usdg, sherd } = useFundBalances()
  const { ethUsd } = useEthUsd()
  const sherdQuote = useSherdQuote()
  const allocationSlices = useMemo(() => {
    const ethPrice = ethUsd ?? 0
    const ethVal = eth != null && ethPrice ? eth * ethPrice : 0
    const wethVal = weth != null && ethPrice ? weth * ethPrice : 0
    const usdgVal = usdg ?? 0
    const sherdTokenVal = sherd != null && sherdQuote?.priceUsd ? sherd * sherdQuote.priceUsd : 0
    const slices = [
      { key: "eth", label: "ETH", value: ethVal, color: "#627eea" },
      { key: "weth", label: "WETH", value: wethVal, color: "#8b9cf7" },
      { key: "usdg", label: "USDG", value: usdgVal, color: "#ccff00" },
      { key: "shrd", label: "SHERD", value: sherdTokenVal, color: "#bef264" },
    ]
    if (sealedPrincipalUsd > 0) {
      slices.push({
        key: "sealed",
        label: "Sealed",
        value: sealedPrincipalUsd,
        color: "#84cc16",
      })
    }
    for (const [symbol, amount] of holdingsBySymbol) {
      const price = quotes[symbol]?.price ?? 0
      if (!price) continue
      slices.push({
        key: `stk-${symbol}`,
        label: symbol,
        value: (Number(amount) / 1e18) * price,
        color: symbolHashColor(symbol),
      })
    }
    if (sealedPrincipalUsd === 0 && holdingsBySymbol.length === 0 && markUsd > 0) {
      slices.push({
        key: "sherds",
        label: "Sherd NAV",
        value: markUsd,
        color: "#a3e635",
      })
    }
    return slices
  }, [
    eth,
    weth,
    usdg,
    sherd,
    ethUsd,
    sherdQuote,
    sealedPrincipalUsd,
    holdingsBySymbol,
    quotes,
    markUsd,
  ])

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
    if (!address) return
    const ok = window.confirm(
      "Delete my Sherhood account?\n\nThis removes your display name, avatar, receive settings, and cached XP/activity from our database, then clears this browser and disconnects.\n\nOn-chain deposits, Sherds, and trades cannot be deleted — they stay on Robinhood Chain."
    )
    if (!ok) return

    setPending(true)
    try {
      const updatedAt = Date.now()
      const message = profileDeleteMessage({ address, updatedAt })
      const signature = await signMessageAsync({ message })
      const res = await fetch("/api/profiles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, updatedAt, signature }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || "Delete failed")

      try {
        localStorage.removeItem(profileStorageKey(address))
      } catch {
        /* ignore */
      }
      disconnect()
      clearInterfaceData()
      setDone(true)
      toast.success("Account deleted")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account")
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
      <AccountSubnav />
      <ProfileIdentityEditor
        onSaved={upsertLocal}
        stats={{
          xp: profileFailed ? "—" : (profile?.xp ?? 0),
          streak: profileFailed ? "—" : `${profile?.streak ?? 0}d streak`,
          sherds: activeCards.length,
        }}
        actions={
          <>
            <BuyShrhButton />
            <WalletButton />
            <Link href="/people" className={buttonVariants({ variant: "outline", size: "sm" })}>
              People
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => disconnect()}
            >
              <LogOut className="size-3.5" aria-hidden />
              Sign out
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-6">
        {/* Balances + Mark PnL snapshot — dense 2-col */}
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <WalletBalancesCard sherdNavUsd={markUsd} sherdReady={pnlReady} />

          <section
            aria-label="Mark PnL"
            className="relative rounded-2xl border border-white/[0.08] bg-[#070707] p-5 sm:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 top-0 size-40 rounded-full bg-[#ccff00]/8 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Mark PnL
              </p>
              <SharePnlButton
                name={mine?.name || shortAddr(address)}
                markUsd={markUsd}
                costUsd={costBasisUsd}
                pnlUsd={pnlUsd}
                cards={shareCardOptions}
                disabled={!pnlReady}
              />
            </div>
            {pnlReady ? (
              <p
                className={cn(
                  "relative mt-3 break-words text-[clamp(1.75rem,6vw,3.25rem)] font-black leading-none tabular-nums tracking-tight",
                  pnlTone
                )}
              >
                {pnlUsd >= 0 ? "+" : ""}
                ${pnlUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            ) : (
              <Skeleton className="relative mt-3 h-12 w-40 bg-white/10 sm:h-14" />
            )}
            <div className="relative mt-3 flex flex-col gap-1 text-sm text-white/45">
              {pnlReady ? (
                <>
                  <p className="break-words tabular-nums">
                    {pnlPct >= 0 ? "+" : ""}
                    {pnlPct.toFixed(2)}% vs cost
                  </p>
                  <p className="break-words tabular-nums">
                    Mark ${markUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span className="mx-1.5 text-white/25">·</span>
                    Cost ${costBasisUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </>
              ) : (
                <p>Loading live prices…</p>
              )}
            </div>
            {pnlReady && holdingsBySymbol.length > 0 ? (
              <p
                className={cn(
                  "relative mt-2 break-words text-xs font-semibold tabular-nums",
                  dayMarkDeltaUsd >= 0 ? "text-[#ccff00]/90" : "text-red-400"
                )}
              >
                Today {dayMarkDeltaUsd >= 0 ? "+" : ""}
                ${dayMarkDeltaUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} on
                holdings
              </p>
            ) : null}
            <div className="relative mt-4">
              {pnlReady ? (
                <MarkCostChart markUsd={markUsd} costUsd={costBasisUsd} height={120} />
              ) : (
                <Skeleton className="h-[120px] w-full bg-white/10" />
              )}
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <StatTile
                label="Deposited"
                value={`$${fmtUsdg(totalDeposited)}`}
                loading={cardsLoading}
              />
              <StatTile
                label="Sherds"
                value={String(activeCards.length)}
                hint={`${activeCards.filter((c) => c.revealed).length} revealed`}
                loading={cardsLoading}
              />
              <StatTile
                label="XP"
                value={profileFailed ? "—" : String(profile?.xp ?? 0)}
                loading={statsLoading}
              />
              <StatTile
                label="Rank"
                value={
                  profileFailed
                    ? "—"
                    : profile?.rank != null
                      ? `#${profile.rank}`
                      : "—"
                }
                hint="Leaderboard"
                loading={statsLoading}
              />
              <StatTile
                label="Streak"
                value={profileFailed ? "—" : `${profile?.streak ?? 0}d`}
                loading={statsLoading}
              />
            </div>
          </section>
        </div>

        {/* Charts row — scale for more data */}
        <section aria-label="Charts" className="grid gap-4 lg:grid-cols-3">
          <div className="product-surface p-4 sm:p-5">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Principal</h2>
                <p className="text-xs text-muted-foreground">Net deposits over time</p>
              </div>
              <Link href="/leaderboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Board
              </Link>
            </div>
            {statsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : profileFailed ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                History unavailable.
              </div>
            ) : (
              <PortfolioChart timeline={profile?.timeline ?? []} height={148} />
            )}
          </div>

          <div className="product-surface p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">Allocation</h2>
            <p className="mb-3 text-xs text-muted-foreground">Cash + holdings</p>
            <AllocationChart slices={allocationSlices} height={148} />
          </div>

          <div className="product-surface p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">Holdings</h2>
            <p className="mb-2 text-xs text-muted-foreground">Claimable · live marks</p>
            {cardsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : holdingsBySymbol.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nothing to claim yet.
              </p>
            ) : (
              <>
                <ul className="max-h-36 divide-y divide-border scroll-mask-y">
                  {holdingsBySymbol.map(([symbol, amount]) => (
                    <li key={symbol}>
                      <ClaimableStockRow
                        symbol={symbol}
                        amountWei={amount}
                        price={quotes[symbol]?.price}
                        changePct={quotes[symbol]?.changePct}
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <TradingViewSymbolTabs
                    symbols={holdingsBySymbol.map(([s]) => s)}
                    height={120}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Sherds + pools/listings */}
        <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="product-surface p-4 sm:p-5" aria-label="Your Sherds">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">Your Sherds</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Showcase · Trade · OpenSea
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <Link href="/inventory" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Full collection
              </Link>
            </div>
          </div>
          {cardsLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
              ))}
            </div>
          ) : activeCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">
                No Sherds yet. Fund a pool to mint one.
              </p>
              <Link href="/app" className={cn(buttonVariants({ size: "sm" }), "mt-3")}>
                Explore pools
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {activeCards.map((card) => {
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
                return (
                  <Link
                    key={String(card.tokenId)}
                    href={`/sherds/${card.tokenId}`}
                    className="group relative block min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50"
                  >
                    <div className="absolute left-2 top-2 z-20">
                      <CardStateBadge revealed={card.revealed} claimed={card.claimed} />
                    </div>
                    {info && info.holdings.length > 0 && (
                      <div className="absolute right-2 top-2 z-20">
                        <StockLogoStack
                          symbols={info.holdings.map((h) => h.symbol)}
                          size={16}
                          max={2}
                        />
                      </div>
                    )}
                    <PotNftCard
                      rarityIndex={rarityIdx}
                      revealed={card.revealed}
                      tokenId={card.tokenId}
                      ownershipPct={
                        card.revealed ? ownershipPct(card.ownershipWeight) : undefined
                      }
                      size="fill"
                      interactive
                      tilt
                    />
                    <p className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/55">
                      <span className="truncate">{RARITIES[rarityIdx] ?? "Sherd"}</span>
                      <span className="tabular-nums">{shareToPct(share)}%</span>
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="product-surface flex-1 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Your Sherd pools</h2>
            <p className="mt-1 text-sm text-muted-foreground">Active deposits by pool.</p>
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
                  Browse pools
                </Link>
              </div>
            ) : (
              <ul className="mt-4 max-h-56 divide-y divide-border scroll-mask-y">
                {myPools.map((pool) => {
                  const info = potInfo.get(pool.pot.toLowerCase())
                  return (
                    <li key={pool.pot}>
                      <Link
                        href={`/pools/${pool.pot}`}
                        className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {basketName(pool.pot)}
                            {info && info.holdings.length > 0
                              ? ` · ${holdingsLabel(info.holdings)}`
                              : ""}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {POT_STATUSES[info?.status ?? -1] ?? "Unknown"} · {pool.cardCount}{" "}
                            Sherd{pool.cardCount === 1 ? "" : "s"}
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
          </div>

          <div className="product-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Pools you created</h2>
            <p className="mt-1 text-sm text-muted-foreground">Community pools launched from your wallet.</p>
            {statsLoading ? (
              <div className="mt-4 flex flex-col gap-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !(profile?.createdPots?.length) ? (
              <div className="mt-4 rounded-xl border border-dashed border-border p-4">
                <p className="text-sm text-muted-foreground">No pools created yet.</p>
                <Link href="/create" className={cn(buttonVariants({ size: "sm" }), "mt-3")}>
                  Create a pool
                </Link>
              </div>
            ) : (
              <ul className="mt-4 max-h-40 divide-y divide-border scroll-mask-y">
                {profile!.createdPots!.map((pot) => (
                  <li key={pot}>
                    <Link
                      href={`/pools/${pot}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <span className="truncate text-sm font-medium">{basketName(pot)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">Open →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="product-surface p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Listings</h2>
                <p className="mt-1 text-sm text-muted-foreground">On Sherhood Trade.</p>
              </div>
              <Link href="/marketplace" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Trade
              </Link>
            </div>
            {!marketplaceLive ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Trading is not configured yet.
              </p>
            ) : myListings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No active listings.
              </p>
            ) : (
              <ul className="max-h-40 divide-y divide-border scroll-mask-y">
                {myListings.map((listing) => (
                  <li
                    key={String(listing.tokenId)}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Sherd #{String(listing.tokenId)}
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
                      {cancelPending ? "Cancelling…" : "Cancel"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        </section>

        {/* Activity */}
        <section className="product-surface p-5 sm:p-6" aria-label="Activity">
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recent on-chain actions + XP.</p>
          {statsLoading ? (
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : profileFailed ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Activity unavailable. Reload to try again.
            </p>
          ) : (profile?.activity.length ?? 0) === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No activity yet. Fund a pool to start earning XP.
            </p>
          ) : (
            <ul className="mt-4 max-h-80 divide-y divide-border scroll-mask-y">
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

        {/* Account */}
        <section aria-label="Account settings" className="grid gap-4 border-t border-border pt-6 lg:grid-cols-2">
          <div className="product-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Wallet
            </p>
            <p className="mt-3 break-all font-mono text-sm text-foreground">{address}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11 w-full gap-2 sm:w-auto"
              onClick={() => disconnect()}
            >
              <LogOut className="size-3.5" aria-hidden />
              Sign out
            </Button>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Experimental software — see{" "}
              <Link href="/legal/terms" className="text-primary underline-offset-4 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy
              </Link>
              .
            </p>
          </div>

          <div className="product-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Account
            </p>
            <h2 className="mt-3 text-lg font-semibold text-foreground">Delete my account</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Removes your name, avatar, and cached stats from Sherhood. Sign once to confirm.
              On-chain Sherds and trades stay public forever.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="mt-5 min-h-11 w-full sm:w-auto"
              disabled={pending}
              onClick={onDelete}
            >
              {pending ? "Deleting…" : "Delete my account"}
            </Button>
            {done ? (
              <p className="mt-3 text-sm text-primary" role="status">
                Account deleted in this browser.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
