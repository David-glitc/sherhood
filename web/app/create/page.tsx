"use client"

import { useMemo, useState } from "react"
import { useAccount, useReadContract } from "wagmi"
import { potFactoryConfig } from "@/lib/contracts"
import { useCreateCommunityPot } from "@/hooks/use-marketplace"
import { BASKET_STOCKS, PROTOCOL_DEFAULTS } from "@/lib/basket-stocks"
import { fmtUsdg } from "@/hooks/use-pots"
import { Button } from "@/components/ui/button"
import { StockLogoStack, StockRegistryGrid } from "@/components/stocks/stock-logo"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { ShrhLuckPill } from "@/components/layout/shrh-luck-pill"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import Link from "next/link"
import { cn } from "@/lib/utils"

const DURATION_PRESETS = [
  { h: "24", label: "24h", hint: "quick round" },
  { h: "72", label: "3 days", hint: "short window" },
  { h: "168", label: "7 days", hint: "standard" },
  { h: "336", label: "14 days", hint: "slow build" },
  { h: "720", label: "30 days", hint: "long haul" },
] as const

export default function CreateBasketPage() {
  const { address, isConnected } = useAccount()
  const { create, isPending } = useCreateCommunityPot()
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

  const [fundingGoal, setFundingGoal] = useState("10000")
  const [minDeposit, setMinDeposit] = useState("10")
  const [durationHours, setDurationHours] = useState("168")
  const [customDuration, setCustomDuration] = useState(false)
  const [customValue, setCustomValue] = useState("10")
  const [customUnit, setCustomUnit] = useState<"hours" | "days">("days")
  const [formError, setFormError] = useState("")
  const [openedAt] = useState(() => Date.now())

  const closesAtLabel = useMemo(() => {
    const hours = Number(durationHours)
    if (!Number.isFinite(hours) || hours < 1) return null
    const closes = new Date(openedAt + hours * 3_600_000)
    const sameYear = closes.getFullYear() === new Date(openedAt).getFullYear()
    return closes.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      ...(sameYear ? {} : { year: "numeric" }),
    })
  }, [durationHours, openedAt])

  const fee = (creationFee as bigint | undefined) ?? 0n
  const isDeployer =
    !!address &&
    !!factoryOwner &&
    address.toLowerCase() === (factoryOwner as string).toLowerCase()
  const chargeFee = !isDeployer && fee > 0n
  const feeLabel = fee > 0n ? fmtUsdg(fee) : "0"

  const previewSymbols = BASKET_STOCKS.slice(0, 5).map((s) => s.symbol)

  const submitLabel = useMemo(() => {
    if (!isConnected) return "Connect"
    if (isPending) return "Creating…"
    if (chargeFee) return `Pay $${feeLabel} USDG · Create basket`
    return "Create basket"
  }, [chargeFee, feeLabel, isConnected, isPending])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    const goal = Number(fundingGoal)
    const min = Number(minDeposit)
    const hours = Number(durationHours)
    if (!Number.isFinite(goal) || goal <= 0) {
      setFormError("Funding goal must be greater than 0 USDG.")
      return
    }
    if (!Number.isFinite(min) || min <= 0 || min > goal) {
      setFormError("Minimum deposit must be greater than 0 and no higher than the funding goal.")
      return
    }
    if (!Number.isFinite(hours) || hours < 1) {
      setFormError("Funding window must be at least 1 hour.")
      return
    }

    await create({
      fundingGoal,
      durationHours,
      minDeposit,
      creationFee: chargeFee ? fee : 0n,
    })
  }

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Create"
        title="New basket"
        description="Set the funding target, minimum deposit, and funding window. Stock tokens are selected only after funding closes."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:gap-12">
      <form
        onSubmit={onSubmit}
        className="product-surface order-2 flex flex-col gap-6 p-4 sm:p-6 lg:order-1"
        aria-describedby={formError ? "create-basket-error" : undefined}
      >
        <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Funding goal</span>
          <span className="text-xs text-muted-foreground">Total USDG required to close the basket.</span>
          <input
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            required
            value={fundingGoal}
            onChange={(e) => setFundingGoal(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold text-foreground transition-colors focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Minimum deposit</span>
          <span className="text-xs text-muted-foreground">Smallest card contribution, in USDG.</span>
          <input
            type="number"
            min="0.000001"
            step="any"
            inputMode="decimal"
            required
            value={minDeposit}
            onChange={(e) => setMinDeposit(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold text-foreground transition-colors focus:border-primary"
          />
        </label>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-foreground">Funding window</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DURATION_PRESETS.map((c) => (
              <button
                key={c.h}
                type="button"
                aria-pressed={!customDuration && durationHours === c.h}
                onClick={() => {
                  setCustomDuration(false)
                  setDurationHours(c.h)
                }}
                className={cn(
                  "touch-target rounded-xl border px-3 py-3 text-left transition-colors",
                  !customDuration && durationHours === c.h
                    ? "border-primary bg-primary/[0.08]"
                    : "border-border bg-background hover:border-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-bold sm:text-base",
                    !customDuration && durationHours === c.h ? "text-primary" : "text-foreground"
                  )}
                >
                  {c.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{c.hint}</span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={customDuration}
              onClick={() => setCustomDuration(true)}
              className={cn(
                "touch-target rounded-xl border px-3 py-3 text-left transition-colors",
                customDuration
                  ? "border-primary bg-primary/[0.08]"
                  : "border-border bg-background hover:border-muted-foreground"
              )}
            >
              <span className={cn("block text-sm font-bold sm:text-base", customDuration ? "text-primary" : "text-foreground")}>
                Custom
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">Choose a window</span>
            </button>
          </div>

          {customDuration && (
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <label className="sr-only" htmlFor="custom-duration">Custom duration</label>
              <input
                id="custom-duration"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value)
                  const n = Number(e.target.value)
                  if (Number.isFinite(n) && n >= 1) {
                    setDurationHours(String(customUnit === "days" ? n * 24 : n))
                  }
                }}
                className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-base font-semibold text-foreground focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1" aria-label="Duration unit">
                {(["hours", "days"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={customUnit === u}
                    onClick={() => {
                      setCustomUnit(u)
                      const n = Number(customValue)
                      if (Number.isFinite(n) && n >= 1) {
                        setDurationHours(String(u === "days" ? n * 24 : n))
                      }
                    }}
                    className={cn(
                      "touch-target rounded-lg px-4 text-xs font-semibold capitalize transition-colors",
                      customUnit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs leading-5 text-muted-foreground">
            {closesAtLabel
              ? `Funding closes ${closesAtLabel}, or sooner if the goal fills first.`
              : "Enter a duration of at least 1 hour."}
          </p>
        </fieldset>

        <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Creation fee</span>
            {isDeployer ? (
              <span className="font-bold text-primary">Free for deployer</span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-primary">
                ${feeLabel} <UsdgLogo size={16} />
              </span>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isDeployer
              ? "The protocol deployer does not pay the basket creation fee."
              : "Charged once when this basket is created. Deposits are separate."}
          </p>
        </div>

        {formError && (
          <p id="create-basket-error" role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="h-12 w-full" disabled={!isConnected || isPending}>
          {submitLabel}
        </Button>
      </form>

      <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
        <div className="product-surface-subtle p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What happens at close</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Protocol luck picks{" "}
          <span className="font-semibold text-primary">
            {PROTOCOL_DEFAULTS.minStocks}–{PROTOCOL_DEFAULTS.maxStocks}
          </span>{" "}
          registered RH stock tokens and splits the basket’s USDG across them.
        </p>
        <StockLogoStack symbols={previewSymbols} size={32} max={5} className="mt-4" />
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Preview only. Actual constituents are selected from the live registry.
        </p>
        <StockRegistryGrid max={20} className="mt-4" />
        <div className="mt-5">
          <ShrhLuckPill />
        </div>
        </div>

        <Link href="/app" className="touch-target mt-4 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
          Back to baskets
        </Link>
      </aside>
      </div>
    </PageShell>
  )
}
