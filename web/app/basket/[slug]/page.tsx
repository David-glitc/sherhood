"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { getAddress, isAddress } from "viem"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potAbi, potCardConfig, entryRouterConfig } from "@/lib/contracts"
import { useDepositPot, type PayAsset } from "@/hooks/use-deposit-pot"
import {
  SlippageControl,
  DEFAULT_SLIPPAGE_PCT,
  minUsdgOutFor,
} from "@/components/pots/slippage-control"
import { useClaimCard } from "@/hooks/use-claim-card"
import {
  POT_STATUSES,
  RARITIES,
  deadlineLabel,
  fmtUsdg,
  holdingsLabel,
  ownershipPct,
  parseHoldings,
} from "@/hooks/use-pots"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { Button } from "@/components/ui/button"
import { BasketOrbitSvg } from "@/components/baskets/basket-orbit-svg"
import { TokenChartCard } from "@/components/baskets/token-chart-card"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { useEthUsd } from "@/hooks/use-eth-usd"
import { toast } from "sonner"
import { robinhood } from "@/lib/chain"
import { cn } from "@/lib/utils"

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
          Baskets
        </Link>
        <h1 className="mt-8 text-[30px] font-normal tracking-[-0.6px] text-[#e5e7eb]">
          No basket at this address
        </h1>
        <p className="mt-3 text-base leading-[22px] tracking-[-0.4px] text-[#999999]">
          Open a live basket from the list, or paste a contract address in the URL.
        </p>
      </div>
    )
  }

  return <BasketView address={potAddress} />
}

function BasketView({ address }: { address: `0x${string}` }) {
  const { address: wallet, isConnected } = useAccount()
  const { deposit, parseDepositAmount, isPending: depositPending, onRobinhood } = useDepositPot()
  const { claim, isPending: claimPending } = useClaimCard()
  const { ethUsd, usdOfEth } = useEthUsd()
  const [amountStr, setAmountStr] = useState("")
  const [payWith, setPayWith] = useState<PayAsset>("ETH")
  const [slippagePct, setSlippagePct] = useState<number>(DEFAULT_SLIPPAGE_PCT)

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
  const title = pot.holdings.length > 0 ? label : "Open basket"
  const displaySymbols =
    pot.holdings.length > 0
      ? pot.holdings.map((h) => h.symbol)
      : BASKET_STOCKS.slice(0, 5).map((s) => s.symbol)
  const chartSymbols =
    pot.holdings.length > 0
      ? pot.holdings.map((h) => h.symbol).slice(0, 6)
      : BASKET_STOCKS.slice(0, 4).map((s) => s.symbol)
  const routerReady =
    entryRouterConfig.address !== "0x0000000000000000000000000000000000000000"
  const amountNum = Number(amountStr)
  const usdHint =
    payWith !== "USDG" && Number.isFinite(amountNum) && amountNum > 0
      ? usdOfEth(amountNum)
      : payWith === "USDG" && Number.isFinite(amountNum) && amountNum > 0
        ? amountNum
        : null
  const explorer = robinhood.blockExplorers.default.url

  const refresh = async () => {
    await Promise.all([refetch(), refetchIds(), refetchCards(), refetchOwners()])
  }

  const onDeposit = async () => {
    if (!amountStr) return
    try {
      if (payWith === "USDG") {
        const parsed = Number(amountStr)
        if (!Number.isFinite(parsed) || parsed <= 0) return
        await deposit(address, parseDepositAmount(parsed), pot.entryFee, "USDG")
      } else {
        const minOut = minUsdgOutFor(usdHint, slippagePct)
        await deposit(address, 0n, pot.entryFee, payWith, amountStr, minOut)
      }
      toast.success("Card minted")
      setAmountStr("")
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deposit failed")
    }
  }

  const fundLabel = !isConnected
    ? "Connect wallet"
    : !onRobinhood
      ? "Switch to Robinhood Chain"
      : depositPending
        ? "Confirm in wallet…"
        : "Fund"

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.09),transparent_55%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:pb-24 sm:pt-10">
        <Link href="/app" className="text-[13px] text-[#999999] transition hover:text-[#e5e7eb]">
          Baskets
        </Link>

        <div className="mt-6 grid gap-8 sm:mt-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-12">
          {/* Fund first on mobile so the CTA is above the fold */}
          <aside className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-24">
            {isFunding ? (
              <div className="rounded-[22px] border border-[#333333] bg-[#0a0a0a] p-5 shadow-[0_0_60px_rgba(204,255,0,0.04)] sm:p-7">
                <p className="text-[12px] tracking-[0.14em] text-[#666666]">FUND</p>
                <p className="mt-2 text-[20px] font-normal tracking-[-0.4px] text-[#e5e7eb] sm:text-[22px]">
                  Mint a mystery card
                </p>
                <p className="mt-2 text-[14px] leading-[20px] text-[#999999]">
                  Pay ETH, WETH, or USDG. Ownership % reveals after purchase.
                </p>

                <div className="mt-5 flex gap-1 rounded-[14px] border border-[#333333] bg-black p-1 sm:mt-6">
                  {(["ETH", "WETH", "USDG"] as PayAsset[]).map((asset) => {
                    const disabled = asset !== "USDG" && !routerReady
                    return (
                      <button
                        key={asset}
                        type="button"
                        disabled={disabled}
                        aria-pressed={payWith === asset}
                        onClick={() => setPayWith(asset)}
                        className={cn(
                          "flex h-11 min-h-11 flex-1 items-center justify-center gap-1 rounded-[10px] text-[12px] font-medium transition sm:text-[13px]",
                          payWith === asset
                            ? "bg-[#ccff00] text-black"
                            : "text-[#999999] hover:text-[#e5e7eb] disabled:opacity-30"
                        )}
                      >
                        {asset === "USDG" ? <UsdgLogo size={14} /> : null}
                        {asset}
                      </button>
                    )
                  })}
                </div>

                {payWith === "ETH" && (
                  <div className="mt-3 flex gap-2">
                    {["0.01", "0.1", "1"].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setAmountStr(chip)}
                        className="h-10 min-h-10 flex-1 rounded-[10px] border border-[#333333] text-[12px] text-[#999999] transition hover:border-[#ccff00]/50 hover:text-[#e5e7eb]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                <label className="mt-4 block">
                  <span className="sr-only">Amount</span>
                  <input
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    inputMode="decimal"
                    placeholder={payWith === "USDG" ? "USDG amount" : `${payWith} amount`}
                    className="h-14 w-full rounded-[14px] border border-[#333333] bg-black px-4 text-[20px] tracking-[-0.4px] text-[#e5e7eb] outline-none placeholder:text-[#444444] focus:border-[#ccff00] sm:text-[22px]"
                  />
                </label>

                {usdHint != null && (
                  <p className="mt-2 text-[13px] text-[#666666]">
                    ≈ ${usdHint.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {ethUsd != null && payWith === "ETH"
                      ? ` · ETH $${ethUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : ""}
                  </p>
                )}

                {payWith !== "USDG" && (
                  <div className="mt-4">
                    <SlippageControl
                      value={slippagePct}
                      onChange={setSlippagePct}
                      disabled={depositPending}
                    />
                    <p className="mt-2 text-[11px] text-[#666666]">
                      {usdHint != null
                        ? `Swap reverts if it returns less than $${(usdHint * (1 - slippagePct / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG.`
                        : "No live ETH price yet — swap will run without a minimum."}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  size="lg"
                  className="mt-5 h-14 w-full rounded-[14px] text-base sm:mt-6"
                  disabled={!isConnected || depositPending || !amountStr || !onRobinhood}
                  onClick={onDeposit}
                >
                  {fundLabel}
                </Button>

                {!isConnected && (
                  <p className="mt-3 text-center text-[12px] text-[#666666]">
                    Connect from the header to fund.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-[22px] border border-[#333333] bg-[#0a0a0a] p-5 sm:p-7">
                <p className="text-[12px] tracking-[0.14em] text-[#666666]">STATUS</p>
                <p className="mt-2 text-[20px] font-normal tracking-[-0.4px] text-[#e5e7eb] sm:text-[22px]">
                  {status}
                </p>
                <p className="mt-2 text-[14px] leading-[20px] text-[#999999]">
                  {pot.status === 3
                    ? "Revealed. Claim from your cards below if you funded."
                    : "Funding is closed. Operators run purchase and reveal."}
                </p>
                <Link
                  href="/inventory"
                  className="mt-6 inline-flex h-12 min-h-12 items-center rounded-[14px] border border-[#333333] px-5 text-[14px] text-[#e5e7eb] transition hover:border-[#ccff00] hover:text-[#ccff00]"
                >
                  Open cards
                </Link>
              </div>
            )}

            <p className="mt-4 px-1 text-[12px] leading-5 text-[#555555]">
              Experimental software. Deposits may be lost. See{" "}
              <Link href="/legal/terms" className="text-[#777777] underline-offset-2 hover:underline">
                Terms
              </Link>
              .
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
                <h1 className="mt-4 break-words text-[32px] font-normal leading-[1.05] tracking-[-0.6px] text-[#e5e7eb] sm:text-[48px]">
                  {title}
                </h1>
                <p className="mt-3 max-w-md text-[14px] leading-6 tracking-[-0.2px] text-[#999999] sm:text-[15px]">
                  {isFunding
                    ? "Pool USDG now. When the goal fills, luck picks 2–5 RH stocks into this vault."
                    : pot.holdings.length > 0
                      ? "Portfolio locked. Reveal and claim your fractional share."
                      : "Funding closed. Purchase and reveal run on-chain."}
                </p>
              </div>
              <BasketOrbitSvg
                progress={progress}
                symbols={displaySymbols}
                className="max-w-[240px] sm:max-w-[280px] lg:max-w-[320px]"
              />
            </div>

            {/* Raise */}
            <div className="mt-8 rounded-[22px] border border-[#333333] bg-[#0a0a0a]/80 p-5 sm:mt-10 sm:p-8">
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
                aria-label="Basket funding progress"
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

            {/* Token charts */}
            <div className="mt-8 sm:mt-10">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] tracking-[0.12em] text-[#666666]">
                  {pot.holdings.length > 0 ? "HOLDINGS · LIVE" : "REGISTRY · LIVE"}
                </p>
                <p className="text-[12px] text-[#555555]">5-day</p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {chartSymbols.map((sym) => (
                  <TokenChartCard key={sym} symbol={sym} />
                ))}
              </div>
              {pot.holdings.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {pot.holdings.map((h) => (
                    <li
                      key={h.token}
                      className="flex items-center justify-between gap-3 rounded-[14px] border border-[#222222] bg-[#0a0a0a] px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-[#e5e7eb]">{h.symbol}</span>
                      <span className="shrink-0 font-mono text-[#999999]">{fmtUsdg(h.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-8 rounded-[18px] border border-[#222222] bg-[#0a0a0a]/60 px-4 py-4 sm:mt-10 sm:px-5">
              <p className="text-[12px] tracking-[0.12em] text-[#666666]">CONTRACT</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12px] sm:text-[13px]">
                <button
                  type="button"
                  onClick={() => copyText(address)}
                  className="break-all text-left text-[#ccff00] transition hover:underline"
                >
                  {shortAddr(address)}
                </button>
                <a
                  href={`${explorer}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#333333] px-3 py-1 text-[#999999] hover:border-[#ccff00]/40 hover:text-[#e5e7eb]"
                >
                  Explorer
                </a>
                {pot.creator && (
                  <a
                    href={`${explorer}/address/${pot.creator}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#999999] hover:text-[#e5e7eb]"
                  >
                    Creator {shortAddr(pot.creator)}
                  </a>
                )}
              </div>
            </div>

            {myDeposits.length > 0 && (
              <div className="mt-8 sm:mt-10">
                <p className="text-[12px] tracking-[0.12em] text-[#666666]">YOUR CARDS</p>
                <ul className="mt-4 space-y-3">
                  {myDeposits.map(({ tokenId, card: c }) => {
                    if (!c) return null
                    return (
                      <li
                        key={tokenId.toString()}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#333333] bg-[#0a0a0a] p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] text-[#e5e7eb]">
                            #{tokenId.toString()}
                            <span className="ml-2 rounded-full bg-[#191919] px-2 py-0.5 text-[11px] text-[#999999]">
                              {c.revealed ? RARITIES[c.rarity] : "Sealed"}
                            </span>
                          </p>
                          <p className="mt-1 text-[13px] text-[#999999]">
                            ${fmtUsdg(c.depositAmount)}
                            {c.revealed ? ` · ${ownershipPct(c.ownershipWeight)}%` : ""}
                            {c.claimed ? " · claimed" : ""}
                          </p>
                        </div>
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
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="mt-8 sm:mt-10">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] tracking-[0.12em] text-[#666666]">DEPOSITS</p>
                <p className="text-[12px] text-[#666666]">{deposits.length} cards</p>
              </div>
              {deposits.length === 0 ? (
                <p className="mt-4 text-[14px] text-[#666666]">Waiting for the first funder.</p>
              ) : (
                <div className="mt-4 -mx-1 max-h-72 overflow-x-auto overflow-y-auto rounded-[18px] border border-[#222222] sm:mx-0">
                  <table className="w-full min-w-[280px] text-left text-[13px]">
                    <thead className="sticky top-0 bg-[#0a0a0a] text-[11px] tracking-[0.08em] text-[#555555]">
                      <tr>
                        <th className="px-3 py-3 font-medium sm:px-4">Card</th>
                        <th className="px-3 py-3 font-medium sm:px-4">Wallet</th>
                        <th className="px-3 py-3 text-right font-medium sm:px-4">USDG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141414] font-mono text-[#999999]">
                      {deposits.map(({ tokenId, owner, card: c }) => (
                        <tr key={tokenId.toString()} className="bg-[#050505]/40">
                          <td className="px-3 py-2.5 text-[#e5e7eb] sm:px-4">
                            #{tokenId.toString()}
                          </td>
                          <td className="px-3 py-2.5 sm:px-4">
                            {owner ? shortAddr(owner) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right sm:px-4">
                            {c ? fmtUsdg(c.depositAmount) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
