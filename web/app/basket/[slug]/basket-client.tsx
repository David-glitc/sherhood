"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
  holdingsLabel,
  ownershipPct,
  parseHoldings,
  effectiveRarityIndex,
} from "@/hooks/use-pots"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { basketName } from "@/lib/basket-name"
import { Button } from "@/components/ui/button"
import { BasketOrbitSvg } from "@/components/baskets/basket-orbit-svg"
import { TokenChartCard } from "@/components/baskets/token-chart-card"
import { FundAmountPanel } from "@/components/pots/fund-amount-panel"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { toast } from "sonner"
import { robinhood } from "@/lib/chain"
import { cn } from "@/lib/utils"
import { ShareButton } from "@/components/share/share-button"
import { SHERHOOD_TAGLINE } from "@/lib/protocol"
import { UserChip } from "@/components/profile/user-chip"
import { useProfiles } from "@/hooks/use-profiles"

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
  const { address: wallet, isConnected } = useAccount()
  const { claim, isPending: claimPending } = useClaimCard()
  const { earlyExit, refund, isPending: exitPending } = useExitCard()

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
    ],
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
    }
  }, [data])

  const { data: tokenIdsData, refetch: refetchIds } = useReadContract({
    ...potCardConfig,
    functionName: "potTokenIds",
    args: [address],
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
    query: { enabled: tokenIds.length > 0 },
  })

  const { data: ownersData, refetch: refetchOwners } = useReadContracts({
    contracts: tokenIds.map((tokenId) => ({
      ...potCardConfig,
      functionName: "ownerOf",
      args: [tokenId],
    })),
    query: { enabled: tokenIds.length > 0 },
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
  const progress = Math.min(100, Number(pot.progressBps) / 100)
  const label = holdingsLabel(pot.holdings)
  const title = basketName(address)
  const displaySymbols =
    pot.holdings.length > 0
      ? pot.holdings.map((h) => h.symbol)
      : BASKET_STOCKS.slice(0, 5).map((s) => s.symbol)
  const chartSymbols =
    pot.holdings.length > 0
      ? pot.holdings.map((h) => h.symbol).slice(0, 6)
      : BASKET_STOCKS.slice(0, 4).map((s) => s.symbol)
  const explorer = robinhood.blockExplorers.default.url

  const refresh = async () => {
    await Promise.all([refetch(), refetchIds(), refetchCards(), refetchOwners()])
  }

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.09),transparent_55%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:pb-24 sm:pt-10">
        <Link href="/app" className="text-[13px] text-[#999999] transition hover:text-[#e5e7eb]">
          Pools
        </Link>

        <div className="mt-6 grid gap-8 sm:mt-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-12">
          {/* Fund first on mobile so the CTA is above the fold */}
          <aside className="order-1 min-w-0 space-y-4 lg:order-2 lg:sticky lg:top-20">
            {isFunding ? (
              <div className="rounded-[22px] border border-[#333333] bg-[#0a0a0a] p-5 shadow-[0_0_60px_rgba(204,255,0,0.04)] sm:p-7">
                <p className="text-[12px] tracking-[0.14em] text-[#666666]">FUND</p>
                <FundAmountPanel
                  className="mt-4"
                  potAddress={address}
                  minDeposit={pot.minDeposit}
                  entryFee={pot.entryFee}
                  isConnected={isConnected}
                  onMinted={async () => {
                    toast.success("Sherd minted")
                    await refresh()
                  }}
                />
              </div>
            ) : (
              <div className="rounded-[22px] border border-[#333333] bg-[#0a0a0a] p-5 sm:p-7">
                <p className="text-[12px] tracking-[0.14em] text-[#666666]">STATUS</p>
                <p className="mt-2 text-[20px] font-normal tracking-[-0.4px] text-[#e5e7eb] sm:text-[22px]">
                  {status}
                </p>
                <Link
                  href="/inventory"
                  className="mt-6 inline-flex h-12 min-h-12 items-center rounded-[14px] border border-[#333333] px-5 text-[14px] text-[#e5e7eb] transition hover:border-[#ccff00] hover:text-[#ccff00]"
                >
                  Cards
                </Link>
              </div>
            )}

            {/* Registry + owner sit under the fund rail */}
            <div className="rounded-[22px] border border-[#222222] bg-[#0a0a0a]/90 p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] tracking-[0.12em] text-[#666666]">
                  {pot.holdings.length > 0 ? "HOLDINGS" : "REGISTRY"}
                </p>
                <p className="text-[11px] text-[#555555]">5-day</p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5">
                {chartSymbols.slice(0, 4).map((sym) => (
                  <TokenChartCard key={sym} symbol={sym} />
                ))}
              </div>
              {pot.holdings.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {pot.holdings.map((h) => (
                    <li
                      key={h.token}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-[#1a1a1a] bg-black/40 px-3 py-2 text-[12px]"
                    >
                      <span className="font-medium text-[#e5e7eb]">{h.symbol}</span>
                      <span className="shrink-0 font-mono text-[#999999]">{fmtUsdg(h.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 border-t border-[#1a1a1a] pt-4">
                <p className="text-[11px] tracking-[0.12em] text-[#666666]">OWNER</p>
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
              </div>
            </div>

            <p className="px-1 text-[12px] leading-5 text-[#555555]">
              <Link href="/legal/terms" className="text-[#777777] underline-offset-2 hover:underline">
                Terms
              </Link>
            </p>
          </aside>

          <div className="order-2 min-w-0 lg:order-1">
            {/* Hero: text + orbit */}
            <div className="flex flex-col items-stretch gap-6 sm:grid sm:grid-cols-[1fr_minmax(180px,260px)] sm:items-center sm:gap-8">
              <div className="min-w-0">
                <p
                  className={cn(
                    "inline-flex max-w-full flex-wrap items-center gap-x-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.14em]",
                    isFunding
                      ? "bg-[#ccff00]/12 text-[#ccff00]"
                      : "bg-[#191919] text-[#999999]"
                  )}
                >
                  <span>{status.toUpperCase()}</span>
                  <span className="opacity-40">·</span>
                  <span className="font-medium tracking-normal text-[#999999]">
                    {deadlineLabel(pot.deadline)}
                  </span>
                </p>
                <h1 className="mt-4 break-words text-[34px] font-normal leading-[1.05] tracking-[-0.6px] text-[#e5e7eb] sm:text-[48px]">
                  {title}
                </h1>
                <p className="mt-3 max-w-md text-[14px] leading-6 tracking-[-0.2px] text-[#999999] sm:text-[15px]">
                  {isFunding
                    ? "Pool USDG now. When the goal fills, luck picks 2–5 RH stocks into this vault."
                    : pot.holdings.length > 0
                      ? `Holding ${label}. Reveal and claim your fractional share.`
                      : "Funding closed. Purchase and reveal run on-chain."}
                </p>
                <ShareButton
                  className="mt-5"
                  path={`/basket/${address}`}
                  title={`${title} on Sherhood`}
                  text={`${title} · ${status}. ${SHERHOOD_TAGLINE}.`}
                  label="Share pool"
                />
              </div>
              <BasketOrbitSvg
                progress={progress}
                symbols={displaySymbols}
                className="w-[220px] sm:w-full sm:max-w-[260px] lg:max-w-[300px] sm:justify-self-end"
              />
            </div>

            {/* Raise */}
            <div className="mt-6 rounded-[22px] border border-[#333333] bg-[#0a0a0a]/80 p-5 sm:mt-8 sm:p-8">
              <p className="text-[12px] tracking-[0.12em] text-[#666666]">RAISED</p>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[40px] font-normal leading-none tracking-[-1.5px] text-[#e5e7eb] sm:text-[56px]">
                  ${fmtUsdg(pot.totalDeposited)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[16px] text-[#666666] sm:text-[18px]">
                  / ${fmtUsdg(pot.fundingGoal)}
                  <UsdgLogo size={16} />
                </span>
              </p>
              <div
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#1a1a1a] sm:mt-6"
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
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  `${progress.toFixed(0)}% filled`,
                  `${Number(pot.participantCount)} joined`,
                  `min $${fmtUsdg(pot.minDeposit)}`,
                  pot.entryFee > 0n ? `entry $${fmtUsdg(pot.entryFee)}` : null,
                  `protocol ${Number(pot.protocolFeeBps) / 100}%`,
                ]
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={String(t)}
                      className="rounded-full border border-[#333333] px-3 py-1 text-[12px] text-[#999999]"
                    >
                      {t}
                    </span>
                  ))}
              </div>
            </div>

            {/* Funders — up under raise, better container */}
            <div className="mt-5 rounded-[22px] border border-[#333333] bg-gradient-to-b from-[#0c0c0c] to-[#080808] p-4 sm:mt-6 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] tracking-[0.12em] text-[#666666]">FUNDERS</p>
                <p className="text-[12px] tabular-nums text-[#999999]">
                  {deposits.length} {deposits.length === 1 ? "card" : "cards"}
                </p>
              </div>
              {deposits.length === 0 ? (
                <p className="mt-4 rounded-[14px] border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-[14px] text-[#666666]">
                  Waiting for the first funder.
                </p>
              ) : (
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-0.5">
                  {deposits.map(({ tokenId, owner, card: c }) => {
                    const p = owner ? getProfile(owner) : null
                    return (
                      <li
                        key={tokenId.toString()}
                        className="flex items-center gap-3 rounded-[14px] border border-[#1f1f1f] bg-black/50 px-3 py-2.5"
                      >
                        <Link
                          href={`/sherd/${tokenId.toString()}`}
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
                            <span className="text-[13px] text-[#666666]">—</span>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-[13px] tabular-nums text-[#e5e7eb]">
                          {c ? `$${fmtUsdg(c.depositAmount)}` : "—"}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {myDeposits.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <p className="text-[12px] tracking-[0.12em] text-[#666666]">YOUR SHERDS</p>
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
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#333333] bg-[#0a0a0a] p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] text-[#e5e7eb]">
                            <Link
                              href={`/sherd/${tokenId.toString()}`}
                              className="hover:text-[#ccff00] hover:underline"
                            >
                              #{tokenId.toString()}
                            </Link>
                            <span className="ml-2 rounded-full bg-[#191919] px-2 py-0.5 text-[11px] text-[#999999]">
                              {c.revealed ? RARITIES[rarityIdx] : "Sealed"}
                            </span>
                          </p>
                          <p className="mt-1 text-[13px] text-[#999999]">
                            ${fmtUsdg(c.depositAmount)}
                            {c.revealed ? ` · ${ownershipPct(c.ownershipWeight)}%` : ""}
                            {c.claimed ? " · claimed" : ""}
                          </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                          {isFunding && !c.revealed && !c.claimed && (
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
                                  toast.error(e instanceof Error ? e.message : "Exit failed")
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
                                  toast.error(e instanceof Error ? e.message : "Refund failed")
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
                              className="w-full rounded-[14px] sm:w-auto"
                              disabled={claimPending}
                              onClick={async () => {
                                try {
                                  await claim(address, tokenId)
                                  toast.success("Claimed")
                                  await refresh()
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "Claim failed")
                                }
                              }}
                            >
                              Claim
                            </Button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
