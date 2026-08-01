"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { getAddress, isAddress } from "viem"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potAbi, potCardConfig } from "@/lib/contracts"
import { useClaimCard } from "@/hooks/use-claim-card"
import { useExitCard } from "@/hooks/use-exit-card"
import {
  POT_STATUSES,
  RARITIES,
  deadlineLabel,
  fmtUsdg,
  ownershipPct,
  parseHoldings,
  effectiveRarityIndex,
  isAcceptingDeposits,
  isReadyToEndPool,
} from "@/hooks/use-pots"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { basketName } from "@/lib/basket-name"
import { Button } from "@/components/ui/button"
import { BasketOrbitSvg } from "@/components/baskets/basket-orbit-svg"
import { FundAmountPanel } from "@/components/pots/fund-amount-panel"
import { PoolLifecycleOps } from "@/components/pools/pool-lifecycle-ops"
import { PoolHoldingsMark } from "@/components/pools/pool-holdings-mark"
import { VaultMarkCharts } from "@/components/pools/vault-mark-charts"
import { PoolActivityFeed } from "@/components/pools/pool-activity-feed"
import { PoolDetailTabs } from "@/components/pools/pool-detail-tabs"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { useVaultTokenBalances } from "@/hooks/use-vault-token-balances"
import { toast } from "sonner"
import { robinhood } from "@/lib/chain"
import { cn } from "@/lib/utils"
import { ShareButton } from "@/components/share/share-button"
import { SHERHOOD_TAGLINE, SHRH_SYMBOL } from "@/lib/protocol"
import { UserChip } from "@/components/profile/user-chip"
import { useProfiles } from "@/hooks/use-profiles"

/** Pre-reveal estimate: reveal multiplies deposit share into ~0.5×–2× before normalize. */
function revealShareBand(deposit: bigint, total: bigint): string {
  if (total === 0n || deposit === 0n) return "—"
  const fair = (Number(deposit) / Number(total)) * 100
  const lo = fair * 0.5
  const hi = Math.min(100, fair * 2)
  return `~${lo.toFixed(1)}–${hi.toFixed(1)}%`
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Copied")
  } catch {
    toast.error("Copy failed")
  }
}

export default function BasketDetailPage() {
  const params = useParams<{ slug: string }>()
  const raw = (params.slug || "").trim()

  const potAddress = useMemo(() => {
    try {
      if (!isAddress(raw)) return null
      return getAddress(raw)
    } catch {
      return null
    }
  }, [raw])

  if (!potAddress) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24">
        <Link href="/app" className="text-sm text-[#999999] hover:text-[#ccff00]">
          Pools
        </Link>
        <h1 className="mt-8 text-[30px] font-normal tracking-[-0.6px] text-[#e5e7eb]">
          No Sherd pool at this address
        </h1>
        <p className="mt-3 text-base leading-[22px] tracking-[-0.4px] text-[#999999]">
          Open a live Sherd pool from the list, or paste a contract address in the URL.
        </p>
      </div>
    )
  }

  return <BasketView address={potAddress} />
}

function BasketView({ address }: { address: `0x${string}` }) {
  const { address: wallet, isConnected, chainId } = useAccount()
  const onRobinhood = chainId === robinhood.id
  const { claim, isPending: claimPending } = useClaimCard()
  const { earlyExit, refund, isPending: exitPending } = useExitCard()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"overview" | "sherds" | "claim">("overview")

  useEffect(() => {
    const t = searchParams.get("tab")
    if (t === "sherds" || t === "claim" || t === "overview") setTab(t)
  }, [searchParams])

  const { data, refetch } = useReadContracts({
    contracts: [
      { address, abi: potAbi, functionName: "fundingGoal" },
      { address, abi: potAbi, functionName: "deadline" },
      { address, abi: potAbi, functionName: "minDeposit" },
      { address, abi: potAbi, functionName: "entryFee" },
      { address, abi: potAbi, functionName: "status" },
      { address, abi: potAbi, functionName: "totalDeposited" },
      { address, abi: potAbi, functionName: "participantCount" },
      { address, abi: potAbi, functionName: "fundingProgressBps" },
      { address, abi: potAbi, functionName: "getHoldings" },
      { address, abi: potAbi, functionName: "creator" },
      { address, abi: potAbi, functionName: "protocolFeeBps" },
      { address, abi: potAbi, functionName: "claimCount" },
    ],
    query: { refetchInterval: 12_000 },
  })

  const pot = useMemo(() => {
    if (!data || data.slice(0, 9).some((r) => r.status !== "success")) return null
    const holdingsRaw = data[8].result as [string[], bigint[]] | undefined
    return {
      fundingGoal: data[0].result as bigint,
      deadline: data[1].result as bigint,
      minDeposit: data[2].result as bigint,
      entryFee: data[3].result as bigint,
      status: Number(data[4].result),
      totalDeposited: data[5].result as bigint,
      participantCount: data[6].result as bigint,
      progressBps: data[7].result as bigint,
      holdings: parseHoldings(
        holdingsRaw?.[0] as `0x${string}`[] | undefined,
        holdingsRaw?.[1]
      ),
      creator: data[9].status === "success" ? (data[9].result as `0x${string}`) : undefined,
      protocolFeeBps: data[10].status === "success" ? (data[10].result as bigint) : 0n,
      claimCount: data[11].status === "success" ? (data[11].result as bigint) : 0n,
    }
  }, [data])

  const useLiveVault = Boolean(pot && pot.status >= 2 && pot.holdings.length > 0)
  const { liveHoldings, refetch: refetchVaultBal } = useVaultTokenBalances(
    address,
    pot?.holdings ?? [],
    { enabled: useLiveVault, refetchInterval: 12_000 }
  )
  const displayHoldings = useLiveVault ? liveHoldings : pot?.holdings ?? []

  const { data: tokenIdsData, refetch: refetchIds } = useReadContract({
    ...potCardConfig,
    functionName: "potTokenIds",
    args: [address],
    query: { refetchInterval: 12_000 },
  })
  const tokenIds = useMemo(
    () => (tokenIdsData as bigint[] | undefined) ?? [],
    [tokenIdsData]
  )

  const { data: cardsData, refetch: refetchCards } = useReadContracts({
    contracts: tokenIds.map((tokenId) => ({
      ...potCardConfig,
      functionName: "getCard",
      args: [tokenId],
    })),
    query: { enabled: tokenIds.length > 0, refetchInterval: 12_000 },
  })

  const { data: ownersData, refetch: refetchOwners } = useReadContracts({
    contracts: tokenIds.map((tokenId) => ({
      ...potCardConfig,
      functionName: "ownerOf",
      args: [tokenId],
    })),
    query: { enabled: tokenIds.length > 0, refetchInterval: 12_000 },
  })

  const deposits = useMemo(() => {
    return tokenIds.map((tokenId, i) => {
      const cardRaw = cardsData?.[i]?.status === "success" ? cardsData[i].result : null
      const owner =
        ownersData?.[i]?.status === "success"
          ? (ownersData[i].result as `0x${string}`)
          : undefined
      const c = cardRaw as
        | {
            depositAmount: bigint
            ownershipWeight: bigint
            rarity: number
            revealed: boolean
            claimed: boolean
          }
        | null
      return { tokenId, owner, card: c }
    })
  }, [tokenIds, cardsData, ownersData])

  const myDeposits = useMemo(() => {
    if (!wallet) return []
    return deposits.filter((d) => d.owner?.toLowerCase() === wallet.toLowerCase())
  }, [deposits, wallet])

  const profileAddresses = useMemo(() => {
    const list: string[] = []
    if (pot?.creator) list.push(pot.creator)
    for (const d of deposits) {
      if (d.owner) list.push(d.owner)
    }
    return list
  }, [pot?.creator, deposits])
  const { get: getProfile } = useProfiles(profileAddresses)

  if (!pot) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-8 w-40 animate-pulse rounded-full bg-[#191919]" />
        <div className="mt-10 h-16 w-64 animate-pulse rounded-2xl bg-[#191919]" />
        <div className="mt-4 h-3 w-full max-w-md animate-pulse rounded-full bg-[#191919]" />
      </div>
    )
  }

  const status = POT_STATUSES[pot.status] ?? "Unknown"
  const isFunding = pot.status === 0
  const acceptingDeposits = isAcceptingDeposits(
    pot.status,
    pot.deadline,
    pot.totalDeposited,
    pot.fundingGoal
  )
  const readyToEnd = isReadyToEndPool(
    pot.status,
    pot.deadline,
    pot.totalDeposited,
    pot.fundingGoal,
    pot.participantCount
  )
  const progress = Math.min(100, Number(pot.progressBps) / 100)
  const title = basketName(address)
  const orbitSymbols = (
    displayHoldings.length > 0
      ? displayHoldings.map((h) => h.symbol).filter(Boolean)
      : pot.holdings.length > 0
        ? pot.holdings.map((h) => h.symbol).filter(Boolean)
        : BASKET_STOCKS.slice(0, 5).map((s) => s.symbol)
  ).map((s) => s.toUpperCase())
  const explorer = robinhood.blockExplorers.default.url
  const isCreator =
    Boolean(wallet && pot.creator && wallet.toLowerCase() === pot.creator.toLowerCase())

  const refresh = async () => {
    await Promise.all([
      refetch(),
      refetchIds(),
      refetchCards(),
      refetchOwners(),
      refetchVaultBal(),
    ])
  }

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.09),transparent_55%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pb-20 sm:pt-8">
        <Link href="/app" className="text-[13px] text-[#999999] transition hover:text-[#e5e7eb]">
          Pools
        </Link>

        <div className="mt-6 grid gap-8 sm:mt-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-12">
          <aside className="order-1 min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-20">
            {acceptingDeposits ? (
              <div className="rounded-[22px] border border-[#ccff00]/25 bg-[#0a0a0a] p-5 shadow-[0_0_60px_rgba(204,255,0,0.06)] sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ccff00]">
                  Mint a Sherd
                </p>
                <p className="mt-1.5 text-[13px] leading-5 text-[#777]">
                  Pay in ${SHRH_SYMBOL} · sealed until reveal
                </p>
                <FundAmountPanel
                  className="mt-4"
                  potAddress={address}
                  minDeposit={pot.minDeposit}
                  entryFee={pot.entryFee}
                  isConnected={isConnected}
                  onMinted={async () => {
                    toast.success("Sherd locked in")
                    await refresh()
                  }}
                />
              </div>
            ) : (
              <PoolLifecycleOps
                potAddress={address}
                status={pot.status}
                fundingGoal={pot.fundingGoal}
                deadline={pot.deadline}
                totalDeposited={pot.totalDeposited}
                participantCount={pot.participantCount}
                isCreator={isCreator}
                isConnected={isConnected}
                onRobinhood={onRobinhood}
                onDone={refresh}
                prominent
              />
            )}

            {!acceptingDeposits &&
            !readyToEnd &&
            pot.status !== 1 &&
            pot.status !== 2 &&
            pot.status !== 3 &&
            pot.status !== 4 ? (
              <div className="rounded-[22px] border border-[#333333] bg-[#0a0a0a] p-5 sm:p-7">
                <p className="text-[12px] tracking-[0.14em] text-[#666666]">STATUS</p>
                <p className="mt-2 text-[20px] font-normal tracking-[-0.4px] text-[#e5e7eb] sm:text-[22px]">
                  {status}
                </p>
                <Link
                  href="/inventory"
                  className="mt-6 inline-flex h-12 min-h-12 items-center rounded-[14px] border border-[#333333] px-5 text-[14px] text-[#e5e7eb] transition hover:border-[#ccff00] hover:text-[#ccff00]"
                >
                  My Sherds
                </Link>
              </div>
            ) : null}

            <PoolHoldingsMark
              holdings={displayHoldings}
              totalDeposited={pot.totalDeposited}
              status={pot.status}
              claimCount={pot.claimCount}
              participantCount={pot.participantCount}
              amountsAreLive={useLiveVault}
              protocolFeeBps={pot.protocolFeeBps}
            />

            {displayHoldings.length > 0 && pot.status >= 2 ? (
              <VaultMarkCharts holdings={displayHoldings} />
            ) : null}

            <div className="rounded-[22px] border border-[#222222] bg-[#0a0a0a]/90 p-4 sm:p-5">
              <p className="text-[11px] tracking-[0.12em] text-[#666666]">CREATOR</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {pot.creator ? (
                  <UserChip
                    address={pot.creator}
                    name={getProfile(pot.creator)?.name}
                    avatarId={getProfile(pot.creator)?.avatarId}
                    size={26}
                    href={
                      getProfile(pot.creator)?.name
                        ? undefined
                        : `${explorer}/address/${pot.creator}`
                    }
                  />
                ) : (
                  <span className="text-[13px] text-[#666666]">—</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => copyText(address)}
                  className="text-[#ccff00] transition hover:underline"
                >
                  {shortAddr(address)}
                </button>
                <a
                  href={`${explorer}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#333333] px-2.5 py-0.5 text-[#999999] hover:border-[#ccff00]/40 hover:text-[#e5e7eb]"
                >
                  Explorer
                </a>
              </div>
              <dl className="mt-3 space-y-2 text-[12px]">
                <div className="flex items-center justify-between gap-2 rounded-[12px] border border-white/5 bg-black/40 px-3 py-2">
                  <dt className="text-white/40">Protocol fee</dt>
                  <dd className="tabular-nums text-white/80">
                    {Number(pot.protocolFeeBps) / 100}%
                  </dd>
                </div>
              </dl>
            </div>

            <p className="px-1 text-[12px] leading-5 text-[#555555]">
              <Link href="/legal/terms" className="text-[#777777] underline-offset-2 hover:underline">
                Terms
              </Link>
            </p>
          </aside>

          <div className="order-2 min-w-0 lg:order-1">
            {/* Hero: orbit as the visual, title as the signal */}
            <div className="flex flex-col items-center gap-8 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(200px,300px)] sm:items-center sm:gap-10">
              <div className="order-2 min-w-0 w-full text-center sm:order-1 sm:text-left">
                <p
                  className={cn(
                    "inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 text-[12px] font-medium tracking-wide sm:justify-start",
                    isFunding ? "text-[#ccff00]" : "text-[#999999]"
                  )}
                >
                  <span className="font-semibold uppercase tracking-[0.14em]">{status}</span>
                  <span className="text-[#444]">·</span>
                  <span className="tracking-normal text-[#888]">{deadlineLabel(pot.deadline)}</span>
                </p>
                <h1 className="mt-3 break-words text-[36px] font-normal leading-[1.02] tracking-[-0.8px] text-[#e5e7eb] sm:mt-4 sm:text-[48px]">
                  {title}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 tracking-[-0.2px] text-[#999999] sm:mx-0">
                  {acceptingDeposits
                    ? "Mint a sealed Sherd. Reveal lands ~0.5×–2× your deposit share."
                    : pot.holdings.length > 0
                      ? `${pot.holdings.length}-asset vault — claim your cut when ready.`
                      : readyToEnd
                        ? "Window closed — end the pool to buy stocks and reveal."
                        : "Buy + reveal run automatically after funding."}
                </p>
                <p className="mt-4 text-[13px] tabular-nums text-[#666]">
                  <span className="text-[#e5e7eb]">${fmtUsdg(pot.totalDeposited)}</span>
                  <span className="text-[#444]"> / </span>
                  ${fmtUsdg(pot.fundingGoal)}
                  <span className="mx-2 text-[#333]">·</span>
                  {Number(pot.participantCount)} joined
                  {pot.minDeposit > 0n ? (
                    <>
                      <span className="mx-2 text-[#333]">·</span>
                      min ${fmtUsdg(pot.minDeposit)}
                    </>
                  ) : null}
                </p>
                <ShareButton
                  className="mt-5 sm:mt-6"
                  path={`/pools/${address}`}
                  title={`${title} on Sherhood`}
                  text={`${title} · ${status}. ${SHERHOOD_TAGLINE}.`}
                  label="Share"
                />
              </div>
              <BasketOrbitSvg
                progress={progress}
                symbols={orbitSymbols}
                anonymous={false}
                className="order-1 w-[280px] sm:order-2 sm:w-full sm:max-w-[300px] lg:max-w-[320px] sm:justify-self-end"
              />
            </div>

            <div className="mt-8 sm:mt-10">
              <PoolDetailTabs
                tab={tab}
                onTabChange={setTab}
                deposits={deposits}
                myDeposits={myDeposits}
                holdings={pot.holdings}
                potStatus={pot.status}
                wallet={wallet}
                getProfile={getProfile}
                claimPending={claimPending}
                onClaim={async (tokenId) => {
                  await claim(address, tokenId)
                  await refresh()
                }}
                overview={
                  <>
                    <div className="border-b border-[#1f1f1f] pb-6 sm:pb-8">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#666]">
                            Raised
                          </p>
                          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-[40px] font-normal leading-none tracking-[-1.5px] text-[#e5e7eb] sm:text-[52px]">
                              ${fmtUsdg(pot.totalDeposited)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[15px] text-[#666]">
                              of ${fmtUsdg(pot.fundingGoal)}
                              <UsdgLogo size={15} />
                            </span>
                          </p>
                        </div>
                        <p className="text-[13px] tabular-nums text-[#888]">
                          {progress.toFixed(0)}% filled
                        </p>
                      </div>
                      <div
                        className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]"
                        role="progressbar"
                        aria-label="Pool funding progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress)}
                      >
                        <div
                          className="h-full rounded-full bg-[#ccff00] transition-[width] duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-3 text-[12px] leading-relaxed text-[#555]">
                        {[
                          pot.entryFee > 0n ? `Entry $${fmtUsdg(pot.entryFee)}` : null,
                          `Protocol ${Number(pot.protocolFeeBps) / 100}%`,
                          pot.holdings.length > 0
                            ? `${pot.holdings.length} stocks in vault`
                            : acceptingDeposits
                              ? "Stocks picked at close"
                              : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <div className="mt-6 sm:mt-8">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#666]">
                          Holders
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab("sherds")}
                          className="text-[12px] text-[#ccff00] hover:underline"
                        >
                          All Sherds →
                        </button>
                      </div>
                      {deposits.length === 0 ? (
                        <p className="mt-4 border border-dashed border-[#2a2a2a] px-4 py-8 text-center text-[14px] text-[#666]">
                          No Sherds yet — mint to open the table.
                        </p>
                      ) : (
                        <ul className="scroll-mask-y mt-3 max-h-56 space-y-1.5 pr-1">
                          {deposits.slice(0, 8).map(({ tokenId, owner, card: c }) => {
                            const p = owner ? getProfile(owner) : null
                            const shareLabel = c
                              ? c.revealed
                                ? `${ownershipPct(c.ownershipWeight)}%`
                                : revealShareBand(c.depositAmount, pot.totalDeposited)
                              : "—"
                            return (
                              <li
                                key={tokenId.toString()}
                                className="flex items-center gap-3 border-b border-[#141414] px-1 py-2.5 last:border-0"
                              >
                                <Link
                                  href={`/sherds/${tokenId.toString()}`}
                                  className="shrink-0 font-mono text-[13px] text-[#ccff00] hover:underline"
                                >
                                  #{tokenId.toString()}
                                </Link>
                                <div className="min-w-0 flex-1">
                                  {owner ? (
                                    <UserChip
                                      address={owner}
                                      name={p?.name}
                                      avatarId={p?.avatarId}
                                      size={24}
                                    />
                                  ) : (
                                    <span className="text-[13px] text-[#666]">—</span>
                                  )}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="font-mono text-[13px] tabular-nums text-[#e5e7eb]">
                                    {c ? `$${fmtUsdg(c.depositAmount)}` : "—"}
                                  </p>
                                  {c?.revealed ? (
                                    <p className="text-[10px] tabular-nums text-[#ccff00]/80">
                                      {shareLabel}
                                    </p>
                                  ) : null}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="mt-6 sm:mt-8">
                      <PoolActivityFeed potAddress={address} />
                    </div>

                    <p className="mt-5 text-[11px] leading-relaxed text-[#444]">
                      Claiming burns your Sherd and sends vault stocks to your wallet. Dividends
                      route later — marks are spot only.
                    </p>

                    {myDeposits.length > 0 && (
                      <div className="mt-8 border-t border-[#1f1f1f] pt-6 sm:mt-10 sm:pt-8">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#666]">
                            Your Sherds
                          </p>
                          {pot.status === 3 ? (
                            <button
                              type="button"
                              onClick={() => setTab("claim")}
                              className="text-[12px] text-[#ccff00] hover:underline"
                            >
                              Claim portfolio →
                            </button>
                          ) : null}
                        </div>
                        <ul className="mt-4 space-y-3">
                          {myDeposits.map(({ tokenId, card: c }) => {
                            if (!c) return null
                            const rarityIdx = effectiveRarityIndex(
                              c.revealed,
                              c.rarity,
                              c.ownershipWeight
                            )
                            return (
                              <li
                                key={tokenId.toString()}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#2a2a2a] bg-[#0a0a0a] p-4"
                              >
                                <div className="min-w-0">
                                  <p className="text-[15px] text-[#e5e7eb]">
                                    <Link
                                      href={`/sherds/${tokenId.toString()}`}
                                      className="hover:text-[#ccff00] hover:underline"
                                    >
                                      #{tokenId.toString()}
                                    </Link>
                                    <span className="ml-2 text-[11px] text-[#777]">
                                      {c.revealed ? RARITIES[rarityIdx] : "Sealed"}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-[13px] text-[#888]">
                                    ${fmtUsdg(c.depositAmount)}
                                    {c.revealed
                                      ? ` · ${ownershipPct(c.ownershipWeight)}%`
                                      : ` · reveal ~0.5×–2× → ${revealShareBand(c.depositAmount, pot.totalDeposited)}`}
                                    {c.claimed ? " · claimed" : ""}
                                  </p>
                                </div>
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                  {acceptingDeposits && !c.revealed && !c.claimed && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="lg"
                                      className="w-full rounded-[14px] sm:w-auto"
                                      disabled={exitPending}
                                      onClick={async () => {
                                        try {
                                          await earlyExit(address, tokenId)
                                          toast.success("Exited — 5% fee taken")
                                          await refresh()
                                        } catch (e) {
                                          toast.error(
                                            e instanceof Error ? e.message : "Exit failed"
                                          )
                                        }
                                      }}
                                    >
                                      Exit early (−5%)
                                    </Button>
                                  )}
                                  {pot.status === 4 && !c.revealed && !c.claimed && (
                                    <Button
                                      type="button"
                                      size="lg"
                                      className="w-full rounded-[14px] sm:w-auto"
                                      disabled={exitPending}
                                      onClick={async () => {
                                        try {
                                          await refund(address, tokenId)
                                          toast.success("Refunded")
                                          await refresh()
                                        } catch (e) {
                                          toast.error(
                                            e instanceof Error ? e.message : "Refund failed"
                                          )
                                        }
                                      }}
                                    >
                                      Refund
                                    </Button>
                                  )}
                                  {pot.status === 3 && c.revealed && !c.claimed && (
                                    <Button
                                      type="button"
                                      size="lg"
                                      className="w-full rounded-[14px] bg-[#ccff00] text-black sm:w-auto"
                                      onClick={() => setTab("claim")}
                                    >
                                      Claim stocks
                                    </Button>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
