"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAccount, useBalance, useReadContract } from "wagmi"
import { formatEther, formatUnits } from "viem"
import { potFactoryConfig, USDG_ADDRESS, SHRH_ADDRESS } from "@/lib/contracts"
import {
  useCreateCommunityPot,
  type CreateFeeAsset,
} from "@/hooks/use-marketplace"
import { useInstantMint } from "@/hooks/use-instant-mint"
import { BASKET_STOCKS, PROTOCOL_DEFAULTS } from "@/lib/basket-stocks"
import { fmtUsdg } from "@/hooks/use-pots"
import { USDG_DECIMALS, usdgAmountFromDollars } from "@/lib/usdg"
import { useEthUsd } from "@/hooks/use-eth-usd"
import { SHRH_CREATE_WAIVER_USD } from "@/lib/create-fee"
import { SHRH_LAUNCHED, SHRH_SYMBOL } from "@/lib/protocol"
import { randomBasketName } from "@/lib/basket-name"
import {
  INSTANT_MINT_AMOUNTS_USD,
  INSTANT_MINT_DEFAULT_USD,
  type InstantMintAmountUsd,
} from "@/lib/instant-mint"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StockLogoStack, StockRegistryGrid } from "@/components/stocks/stock-logo"
import { BasketOrbitSvg } from "@/components/baskets/basket-orbit-svg"
import { ShrhLuckPill } from "@/components/layout/shrh-luck-pill"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import Link from "next/link"
import { cn } from "@/lib/utils"

const MIN_DURATION_HOURS = 1
const MAX_DURATION_HOURS = 720

const DURATION_PRESETS = [
  { h: "24", label: "24h" },
  { h: "72", label: "3d" },
  { h: "168", label: "7d" },
  { h: "336", label: "14d" },
  { h: "720", label: "30d" },
] as const

type Tab = "instant" | "pool"

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

function tabFromSearch(raw: string | null): Tab {
  if (raw === "pool" || raw === "community") return "pool"
  return "instant"
}

export default function CreateClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address, isConnected } = useAccount()
  const { create, isPending: communityPending } = useCreateCommunityPot()
  const { run: runInstant, isPending: instantPending, phase } = useInstantMint()
  const { ethUsd } = useEthUsd()
  const isPending = communityPending || instantPending

  const { data: creationFee } = useReadContract({
    ...potFactoryConfig,
    functionName: "creationFee",
    args: [],
  })
  const { data: factoryOwner } = useReadContract({
    ...potFactoryConfig,
    functionName: "owner",
    args: [],
  })
  const { data: ethBal } = useBalance({
    address,
    query: { enabled: !!address },
  })
  const { data: usdgBal } = useReadContract({
    address: USDG_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: shrhBal } = useReadContract({
    address: SHRH_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && SHRH_LAUNCHED },
  })

  const [tab, setTab] = useState<Tab>(() =>
    tabFromSearch(searchParams.get("tab") ?? searchParams.get("mode"))
  )
  const [poolName, setPoolName] = useState("")
  const [fundingGoal, setFundingGoal] = useState("100")
  const [minDeposit, setMinDeposit] = useState("2")
  const [durationHours, setDurationHours] = useState("168")
  const [instantAmount, setInstantAmount] =
    useState<InstantMintAmountUsd>(INSTANT_MINT_DEFAULT_USD)
  const [instantPay, setInstantPay] = useState<"USDG" | "ETH" | "SHERD">("SHERD")
  const [feeAssetOverride, setFeeAssetOverride] = useState<CreateFeeAsset | null>(null)
  const [formError, setFormError] = useState("")
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    setTab(tabFromSearch(searchParams.get("tab") ?? searchParams.get("mode")))
  }, [searchParams])

  const selectTab = (next: Tab) => {
    setTab(next)
    setFormError("")
    router.replace(next === "instant" ? "/create?tab=instant" : "/create?tab=pool", {
      scroll: false,
    })
  }

  const fee = (creationFee as bigint | undefined) ?? 0n
  const isDeployer =
    !!address &&
    !!factoryOwner &&
    address.toLowerCase() === (factoryOwner as string).toLowerCase()
  const shrhWaiver =
    SHRH_LAUNCHED &&
    typeof shrhBal === "bigint" &&
    Number(formatUnits(shrhBal, 18)) >= SHRH_CREATE_WAIVER_USD
  const chargeFee = tab === "pool" && !isDeployer && !shrhWaiver && fee > 0n
  const feeLabel = fee > 0n ? fmtUsdg(fee) : "0"

  const usdgBalance =
    typeof usdgBal === "bigint" ? Number(formatUnits(usdgBal, USDG_DECIMALS)) : null
  const ethBalance = ethBal ? Number(formatEther(ethBal.value)) : null
  const feeUsd = fee > 0n ? Number(formatUnits(fee, USDG_DECIMALS)) : 0
  const ethForFee =
    ethUsd && ethUsd > 0 && feeUsd > 0 ? (feeUsd / ethUsd) * 1.03 : null
  const canPayUsdg = usdgBalance != null && usdgBalance + 1e-9 >= feeUsd
  const canPayEth =
    ethForFee != null && ethBalance != null && ethBalance + 1e-12 >= ethForFee
  const canFundInstant =
    instantPay === "USDG"
      ? usdgBalance != null && usdgBalance + 1e-9 >= instantAmount
      : instantPay === "ETH"
        ? ethBalance != null &&
          ethUsd != null &&
          ethUsd > 0 &&
          ethBalance + 1e-12 >= (instantAmount / ethUsd) * 1.04
        : true

  const orbitSymbols = BASKET_STOCKS.slice(0, 5).map((s) => s.symbol)
  const previewSymbols = BASKET_STOCKS.slice(0, 8).map((s) => s.symbol)
  const autoFeeAsset: CreateFeeAsset = canPayUsdg ? "USDG" : canPayEth ? "ETH" : "USDG"
  const payFeeWith = feeAssetOverride ?? autoFeeAsset

  const hoursLabel = useMemo(() => {
    const h = Number(durationHours)
    if (h >= 24 && h % 24 === 0) return `${h / 24}d`
    return `${h}h`
  }, [durationHours])

  const validate = (): string | null => {
    if (poolName.trim().length < 2) return "Name your vault (2+ characters)."
    if (tab === "instant") {
      if (instantPay === "USDG" && !canFundInstant) {
        return `Need ~$${instantAmount} USDG (bal $${(usdgBalance ?? 0).toFixed(2)}).`
      }
      if (instantPay === "ETH" && !canFundInstant) {
        return `Need enough ETH (~$${instantAmount}) for the ticket.`
      }
      return null
    }
    const goal = Number(fundingGoal)
    const min = Number(minDeposit)
    const hours = Number(durationHours)
    if (!Number.isFinite(goal) || goal <= 0) return "Goal must be > 0."
    if (!Number.isFinite(min) || min <= 0 || min > goal) return "Min deposit invalid."
    if (!Number.isFinite(hours) || hours < MIN_DURATION_HOURS || hours > MAX_DURATION_HOURS)
      return "Window must be 1h–30d."
    try {
      usdgAmountFromDollars(goal, "fundingGoal")
      usdgAmountFromDollars(min, "minDeposit")
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid amounts"
    }
    if (chargeFee) {
      if (payFeeWith === "USDG" && !canPayUsdg) return `Need ~$${feeLabel} USDG.`
      if (payFeeWith === "ETH" && (!ethForFee || !canPayEth))
        return "Need ETH for the creation fee."
    }
    return null
  }

  const openReview = () => {
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setFormError("")
    setReviewOpen(true)
  }

  const confirm = async () => {
    if (tab === "instant") {
      const result = await runInstant({
        name: poolName.trim(),
        amountUsd: instantAmount,
        payWith: instantPay,
      })
      setReviewOpen(false)
      if (result?.pot) router.push(`/pools/${result.pot}`)
      return
    }
    const pot = await create({
      name: poolName.trim(),
      fundingGoal,
      durationHours,
      minDeposit,
      creationFee: chargeFee ? fee : 0n,
      payFeeWith: chargeFee ? payFeeWith : undefined,
      ethForFee:
        chargeFee && payFeeWith === "ETH" && ethForFee != null
          ? ethForFee.toFixed(8)
          : undefined,
      sponsored: shrhWaiver,
    })
    setReviewOpen(false)
    if (pot) router.push(`/pools/${pot}`)
  }

  const phaseHint =
    phase === "signing"
      ? "Sign…"
      : phase === "creating"
        ? "Opening vault…"
        : phase === "depositing"
          ? "Funding…"
          : phase === "revealing"
            ? "Buying + reveal…"
            : null

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Create"
        title="New Sherd"
        description="Instant Sherd for a solo reveal, or open a community pool."
      />

      <div
        role="tablist"
        aria-label="Create path"
        className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-black/40 p-1"
      >
        {(
          [
            { id: "instant" as const, label: "Instant Sherd" },
            { id: "pool" as const, label: "Create pool" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={cn(
              "flex-1 rounded-xl py-3 text-sm font-semibold transition",
              tab === t.id
                ? "bg-[#ccff00] text-black"
                : "text-white/45 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
        <div className="product-surface order-2 flex flex-col gap-5 p-5 sm:p-7 lg:order-1">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between gap-2 text-sm font-medium">
              Name
              <button
                type="button"
                className="text-[11px] font-semibold tracking-wide text-primary hover:underline"
                onClick={() => setPoolName(randomBasketName())}
              >
                Random name
              </button>
            </span>
            <input
              type="text"
              required
              maxLength={48}
              placeholder={tab === "instant" ? "e.g. Flash Talon" : "e.g. Stock Gacha"}
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold focus:border-primary"
            />
          </label>

          {tab === "instant" ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Ticket</legend>
                <div className="flex flex-wrap gap-2">
                  {INSTANT_MINT_AMOUNTS_USD.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      aria-pressed={instantAmount === amt}
                      onClick={() => setInstantAmount(amt)}
                      className={cn(
                        "h-11 min-w-[6.5rem] rounded-xl border px-5 text-sm font-semibold transition",
                        instantAmount === amt
                          ? "border-primary bg-primary/[0.1] text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      ${amt.toFixed(2)}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-muted-foreground">
                  You bankroll 100%. Stocks buy + Sherd reveals in the same flow. No $5 create fee.
                </p>
              </fieldset>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Pay with</p>
                <div
                  role="group"
                  aria-label="Pay Instant Sherd with"
                  className="flex gap-1 rounded-xl border border-border p-1"
                >
                  {(["SHERD", "USDG", "ETH"] as const).map((asset) => (
                    <button
                      key={asset}
                      type="button"
                      aria-pressed={instantPay === asset}
                      onClick={() => setInstantPay(asset)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-[12px] font-semibold transition",
                        instantPay === asset
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {asset === "SHERD" ? `$${SHRH_SYMBOL}` : asset}
                    </button>
                  ))}
                </div>
                {instantPay === "USDG" && usdgBalance != null ? (
                  <p className="text-[11px] text-muted-foreground">
                    USDG bal $
                    {usdgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  Other tokens →{" "}
                  <Link href="/buy-shrd" className="text-primary hover:underline">
                    Buy ${SHRH_SYMBOL}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Goal $</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={fundingGoal}
                    onChange={(e) => setFundingGoal(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Min $</span>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    required
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold focus:border-primary"
                  />
                </label>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Window</legend>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((c) => (
                    <button
                      key={c.h}
                      type="button"
                      aria-pressed={durationHours === c.h}
                      onClick={() => setDurationHours(c.h)}
                      className={cn(
                        "h-10 rounded-xl border px-4 text-sm font-semibold transition",
                        durationHours === c.h
                          ? "border-primary bg-primary/[0.1] text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {chargeFee ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      Fee ${feeLabel} <UsdgLogo size={11} />
                    </span>
                    <div
                      role="group"
                      aria-label="Pay creation fee with"
                      className="flex gap-1 rounded-lg border border-border p-0.5"
                    >
                      {(["USDG", "ETH"] as CreateFeeAsset[]).map((asset) => (
                        <button
                          key={asset}
                          type="button"
                          aria-pressed={payFeeWith === asset}
                          onClick={() => setFeeAssetOverride(asset)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
                            payFeeWith === asset
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {payFeeWith === "USDG"
                      ? usdgBalance == null
                        ? "Checking USDG…"
                        : canPayUsdg
                          ? `USDG bal $${usdgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : `Need ~$${feeLabel} USDG`
                      : ethForFee == null
                        ? "Checking ETH…"
                        : canPayEth
                          ? `~${ethForFee.toFixed(5)} ETH`
                          : `Need ~${ethForFee.toFixed(5)} ETH`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {shrhWaiver ? `$${SHRH_SYMBOL} waiver` : isDeployer ? "No create fee" : null}
                </p>
              )}
            </>
          )}

          {formError ? (
            <p role="alert" className="text-sm text-red-400">
              {formError}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="h-12 w-full bg-[#ccff00] text-black hover:brightness-110"
            disabled={!isConnected || isPending}
            onClick={openReview}
          >
            {!isConnected ? "Connect" : tab === "instant" ? "Review Instant Sherd" : "Review pool"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            {tab === "instant"
              ? "No entry fee on Instant Sherd"
              : `+$${PROTOCOL_DEFAULTS.entryFeeUsdg}/Sherd · `}
            {tab === "pool" ? (
              <Link href="/docs/fees" className="hover:text-primary">
                fees
              </Link>
            ) : null}
          </p>
        </div>

        <aside className="product-surface-subtle order-1 flex flex-col gap-5 p-5 sm:p-6 lg:sticky lg:top-24 lg:order-2">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground">
              {tab === "instant" ? "INSTANT FLOW" : "STOCK REGISTRY"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "instant"
                ? "Create → fund → buy → reveal. One Sherd, full vault."
                : `Luck picks ${PROTOCOL_DEFAULTS.minStocks}–${PROTOCOL_DEFAULTS.maxStocks} at seal.`}
            </p>
          </div>
          <BasketOrbitSvg
            progress={0}
            symbols={orbitSymbols}
            className="mx-auto w-full max-w-[240px]"
          />
          <StockLogoStack symbols={previewSymbols} size={32} max={8} />
          <StockRegistryGrid max={20} className="lg:grid-cols-2" />
          <ShrhLuckPill />
          <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">
            ← Pools
          </Link>
        </aside>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#0a0a0a] text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {tab === "instant" ? "Confirm Instant Sherd" : "Confirm pool"}
            </DialogTitle>
            <DialogDescription className="text-white/45">
              {tab === "instant"
                ? "Opens vault, funds it, buys stocks, reveals your Sherd."
                : "Confirm before the create tx."}
            </DialogDescription>
          </DialogHeader>
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            {(tab === "instant"
              ? [
                  ["Name", poolName.trim()],
                  [
                    "You pay",
                    `$${instantAmount.toFixed(2)} via ${instantPay === "SHERD" ? `$${SHRH_SYMBOL}` : instantPay}`,
                  ],
                  ["Create fee", "$0 · deployer"],
                  ["Reveal", "Immediate after fund"],
                ]
              : [
                  ["Name", poolName.trim()],
                  ["Goal", `$${fundingGoal}`],
                  ["Min", `$${minDeposit}`],
                  ["Window", hoursLabel],
                  [
                    "Create fee",
                    chargeFee
                      ? `$${feeLabel} ${payFeeWith}`
                      : shrhWaiver
                        ? "Waived"
                        : "None",
                  ],
                  ["Entry / Sherd", `$${PROTOCOL_DEFAULTS.entryFeeUsdg}`],
                ]
            ).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/40 px-3 py-2"
              >
                <dt className="text-white/40">{k}</dt>
                <dd className="font-medium tabular-nums text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <DialogFooter className="border-0 bg-transparent sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setReviewOpen(false)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#ccff00] text-black hover:brightness-110"
              disabled={isPending}
              onClick={() => void confirm()}
            >
              {isPending
                ? phaseHint || "Working…"
                : tab === "instant"
                  ? "Mint Instant Sherd"
                  : "Confirm create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
