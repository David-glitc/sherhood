"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useBalance, useReadContract } from "wagmi"
import { formatEther, formatUnits } from "viem"
import { potFactoryConfig, USDG_ADDRESS, SHRH_ADDRESS } from "@/lib/contracts"
import {
  useCreateCommunityPot,
  type CreateFeeAsset,
} from "@/hooks/use-marketplace"
import { BASKET_STOCKS, PROTOCOL_DEFAULTS } from "@/lib/basket-stocks"
import { fmtUsdg } from "@/hooks/use-pots"
import { USDG_DECIMALS, usdgAmountFromDollars } from "@/lib/usdg"
import { useEthUsd } from "@/hooks/use-eth-usd"
import { SHRH_CREATE_WAIVER_USD } from "@/lib/create-fee"
import { SHRH_LAUNCHED, SHRH_SYMBOL } from "@/lib/protocol"
import { randomBasketName } from "@/lib/basket-name"
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

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

export default function CreateBasketPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { create, isPending } = useCreateCommunityPot()
  const { ethUsd } = useEthUsd()
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

  const [poolName, setPoolName] = useState("")
  const [fundingGoal, setFundingGoal] = useState("100")
  const [minDeposit, setMinDeposit] = useState("2")
  const [durationHours, setDurationHours] = useState("168")
  const [feeAssetOverride, setFeeAssetOverride] = useState<CreateFeeAsset | null>(null)
  const [formError, setFormError] = useState("")
  const [reviewOpen, setReviewOpen] = useState(false)

  const fee = (creationFee as bigint | undefined) ?? 0n
  const isDeployer =
    !!address &&
    !!factoryOwner &&
    address.toLowerCase() === (factoryOwner as string).toLowerCase()
  const shrhWaiver =
    SHRH_LAUNCHED &&
    typeof shrhBal === "bigint" &&
    Number(formatUnits(shrhBal, 18)) >= SHRH_CREATE_WAIVER_USD
  const chargeFee = !isDeployer && !shrhWaiver && fee > 0n
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

  const orbitSymbols = BASKET_STOCKS.slice(0, 5).map((s) => s.symbol)
  const previewSymbols = BASKET_STOCKS.slice(0, 8).map((s) => s.symbol)

  // Prefer USDG when funded; never override a manual toggle.
  const autoFeeAsset: CreateFeeAsset = canPayUsdg ? "USDG" : canPayEth ? "ETH" : "USDG"
  const payFeeWith = feeAssetOverride ?? autoFeeAsset

  const validate = (): string | null => {
    if (poolName.trim().length < 2) return "Name your pool (2+ characters)."
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

  const openReview = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setFormError("")
    setReviewOpen(true)
  }

  const confirmCreate = async () => {
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

  const hoursLabel = useMemo(() => {
    const h = Number(durationHours)
    if (h >= 24 && h % 24 === 0) return `${h / 24}d`
    return `${h}h`
  }, [durationHours])

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Create"
        title="New pool"
        description={`AssetManager picks ${PROTOCOL_DEFAULTS.minStocks}–${PROTOCOL_DEFAULTS.maxStocks} RH stocks when the pool seals.`}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
        <form
          onSubmit={openReview}
          className="product-surface order-2 flex flex-col gap-5 p-5 sm:p-7 lg:order-1"
        >
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
              placeholder="e.g. Stock Gacha"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold focus:border-primary"
            />
          </label>

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
                      : `Need ~$${feeLabel} USDG (bal $${(usdgBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })})`
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

          {formError ? (
            <p role="alert" className="text-sm text-red-400">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={!isConnected || isPending}
          >
            {!isConnected ? "Connect" : "Review"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            +${PROTOCOL_DEFAULTS.entryFeeUsdg}/Sherd ·{" "}
            <Link href="/docs/fees" className="hover:text-primary">
              fees
            </Link>
          </p>
        </form>

        <aside className="product-surface-subtle order-1 flex flex-col gap-5 p-5 sm:p-6 lg:sticky lg:top-24 lg:order-2">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground">
              STOCK REGISTRY
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Luck picks {PROTOCOL_DEFAULTS.minStocks}–{PROTOCOL_DEFAULTS.maxStocks} of these
              into the vault at seal.
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
            <DialogTitle>Confirm pool</DialogTitle>
            <DialogDescription className="text-white/45">
              Confirm before the create tx.
            </DialogDescription>
          </DialogHeader>
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            {[
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
            ].map(([k, v]) => (
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
              onClick={() => void confirmCreate()}
            >
              {isPending ? "Creating…" : "Confirm create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
