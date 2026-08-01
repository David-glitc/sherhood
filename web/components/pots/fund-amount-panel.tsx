"use client"

/**
 * Lean mint panel: asset toggle + amount + confirm dialog with risk notice.
 */
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import {
  SlippageControl,
  DEFAULT_SLIPPAGE_PCT,
  minUsdgOutFor,
} from "@/components/pots/slippage-control"
import { useDepositPot, type PayAsset } from "@/hooks/use-deposit-pot"
import { useFundBalances } from "@/hooks/use-fund-balances"
import { useEthUsd } from "@/hooks/use-eth-usd"
import { useSherdQuote } from "@/hooks/use-sherd-quote"
import { fmtUsdg, potBlocksEthDeposit } from "@/hooks/use-pots"
import { entryRouterConfig } from "@/lib/contracts"
import { SHRH_SYMBOL, shrhUniswapSellUrl } from "@/lib/protocol"
import { cn } from "@/lib/utils"

const PAY_ASSETS: PayAsset[] = ["SHERD", "USDG", "ETH", "WETH"]

function assetLabel(asset: PayAsset): string {
  if (asset === "SHERD") return `$${SHRH_SYMBOL}`
  return asset
}

type FundAmountPanelProps = {
  potAddress: `0x${string}`
  minDeposit: bigint
  entryFee: bigint
  isConnected: boolean
  className?: string
  dense?: boolean
  onMinted?: (tokenId: bigint | undefined) => void
}

export function FundAmountPanel({
  potAddress,
  minDeposit,
  entryFee,
  isConnected,
  className,
  dense = false,
  onMinted,
}: FundAmountPanelProps) {
  const { deposit, parseDepositAmount, isPending, onRobinhood } = useDepositPot()
  const { usdOfEth } = useEthUsd()
  const { maxFor, balanceOf } = useFundBalances()
  const sherdQuote = useSherdQuote()
  const [amountStr, setAmountStr] = useState("")
  const [payWith, setPayWith] = useState<PayAsset>("SHERD")
  const [slippagePct, setSlippagePct] = useState(DEFAULT_SLIPPAGE_PCT)
  const [showSlip, setShowSlip] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const routerReady =
    entryRouterConfig.address !== "0x0000000000000000000000000000000000000000"
  const legacyBlocks = potBlocksEthDeposit(minDeposit)
  const minDollars = Number(fmtUsdg(minDeposit).replace(/,/g, "")) || 0
  const amountNum = Number(amountStr)

  useEffect(() => {
    if (legacyBlocks && payWith !== "USDG") setPayWith("USDG")
  }, [legacyBlocks, payWith])

  const sherdEth =
    payWith === "SHERD" &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    sherdQuote?.priceNative
      ? amountNum * sherdQuote.priceNative
      : null

  const usdHint = useMemo(() => {
    if (!Number.isFinite(amountNum) || amountNum <= 0) return null
    if (payWith === "USDG") return amountNum
    if (payWith === "SHERD") {
      if (sherdQuote?.priceUsd) return amountNum * sherdQuote.priceUsd
      if (sherdEth != null) return usdOfEth(sherdEth)
      return null
    }
    return usdOfEth(amountNum)
  }, [amountNum, payWith, sherdQuote, sherdEth, usdOfEth])

  const sherdHint = useMemo(() => {
    if (usdHint == null || !sherdQuote?.priceUsd || sherdQuote.priceUsd <= 0) return null
    if (payWith === "SHERD") return amountNum
    return usdHint / sherdQuote.priceUsd
  }, [usdHint, sherdQuote, payWith, amountNum])

  const needsSwap =
    payWith === "SHERD" &&
    sherdEth != null &&
    (balanceOf("ETH") ?? 0) < sherdEth * 0.97

  const runDeposit = async () => {
    if (!amountStr) return

    if (payWith === "USDG") {
      const parsed = Number(amountStr)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      const { tokenId } = await deposit(
        potAddress,
        parseDepositAmount(parsed),
        entryFee,
        "USDG"
      )
      onMinted?.(tokenId)
      setAmountStr("")
      return
    }

    if (payWith === "SHERD") {
      if (sherdEth == null || sherdEth <= 0) {
        toast.error("Waiting for $SHERD price…")
        return
      }
      if (needsSwap) {
        window.open(shrhUniswapSellUrl(amountStr), "_blank", "noopener,noreferrer")
        toast.message(`Swap $${SHRH_SYMBOL} → ETH, then Mint again`)
        return
      }
      const ethStr = sherdEth.toFixed(8).replace(/\.?0+$/, "")
      const minOut = minUsdgOutFor(usdHint, slippagePct)
      const { tokenId } = await deposit(
        potAddress,
        0n,
        entryFee,
        "SHERD",
        ethStr,
        minOut
      )
      onMinted?.(tokenId)
      setAmountStr("")
      return
    }

    const minOut = minUsdgOutFor(usdHint, slippagePct)
    const { tokenId } = await deposit(
      potAddress,
      0n,
      entryFee,
      payWith,
      amountStr,
      minOut
    )
    onMinted?.(tokenId)
    setAmountStr("")
  }

  const onPrimary = () => {
    if (!amountStr) return
    if (needsSwap) {
      void runDeposit()
      return
    }
    setConfirmOpen(true)
  }

  const onConfirm = async () => {
    try {
      await runDeposit()
      setConfirmOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mint failed")
    }
  }

  const cta =
    !isConnected
      ? "Connect"
      : !onRobinhood
        ? "Robinhood Chain"
        : isPending
          ? "…"
          : needsSwap
            ? "Swap"
            : "Mint"

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div
        className={cn(
          "flex gap-1 rounded-xl border border-white/[0.08] bg-black/60 p-1",
          !dense && "rounded-[14px] border-[#333333]"
        )}
      >
        {PAY_ASSETS.map((asset) => {
          const disabled =
            (legacyBlocks && asset !== "USDG") ||
            (asset !== "USDG" && !routerReady)
          return (
            <button
              key={asset}
              type="button"
              disabled={disabled}
              aria-pressed={payWith === asset}
              onClick={() => {
                setPayWith(asset)
                setAmountStr("")
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-bold transition sm:text-xs",
                payWith === asset
                  ? dense
                    ? "bg-white text-black shadow-sm"
                    : "bg-[#ccff00] text-black"
                  : "text-white/40 hover:text-white/70 disabled:opacity-25"
              )}
            >
              {asset === "USDG" ? <UsdgLogo size={12} /> : null}
              {assetLabel(asset)}
            </button>
          )
        })}
      </div>

      {payWith === "ETH" && (
        <div className="flex gap-2">
          {["0.01", "0.1", "1"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setAmountStr(chip)}
              className="flex-1 rounded-lg border border-white/[0.08] py-1.5 text-xs font-semibold text-white/55 transition hover:border-[#ccff00]/40 hover:text-[#ccff00]"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="number"
          min={payWith === "USDG" ? minDollars : 0}
          step="any"
          inputMode="decimal"
          placeholder={payWith === "USDG" ? `min ${minDollars}` : assetLabel(payWith)}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          className={cn(
            "w-full border bg-black/80 text-center font-semibold text-white outline-none transition focus:border-[#ccff00]/55",
            dense
              ? "rounded-xl border-white/[0.1] px-5 py-3.5 text-2xl"
              : "h-14 rounded-[14px] border-[#333333] px-4 text-[20px] sm:text-[22px]"
          )}
        />
        {isConnected && maxFor(payWith) ? (
          <button
            type="button"
            onClick={() => {
              const m = maxFor(payWith)
              if (m) setAmountStr(m)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#ccff00]"
          >
            Max
          </button>
        ) : null}
      </div>

      {(usdHint != null || sherdHint != null || (entryFee > 0n && !dense)) && (
        <p className="text-center text-[11px] tabular-nums text-white/35">
          {sherdHint != null
            ? `≈ ${sherdHint.toLocaleString(undefined, { maximumFractionDigits: 2 })} $${SHRH_SYMBOL}`
            : null}
          {usdHint != null
            ? `${sherdHint != null ? " · " : ""}$${usdHint.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : null}
          {entryFee > 0n && !dense
            ? `${usdHint != null || sherdHint != null ? " · " : ""}+$${fmtUsdg(entryFee)}`
            : null}
        </p>
      )}

      <p className="text-center text-[10px] leading-relaxed text-white/30">
        Unit of account: ${SHRH_SYMBOL}. Other tokens →{" "}
        <a href="/buy-shrd" className="text-[#ccff00]/80 hover:underline">
          swap in
        </a>
        , then mint (settles to USDG in the vault).
      </p>

      {payWith !== "USDG" && (
        <>
          <button
            type="button"
            onClick={() => setShowSlip((v) => !v)}
            className="self-center text-[10px] text-white/30 hover:text-white/55"
          >
            {showSlip ? "Hide slip" : "Slippage"}
          </button>
          {showSlip ? (
            <SlippageControl
              value={slippagePct}
              onChange={setSlippagePct}
              disabled={isPending}
            />
          ) : null}
        </>
      )}

      <Button
        className={cn(
          "w-full font-semibold text-black hover:brightness-110",
          dense
            ? "h-12 rounded-xl bg-[#ccff00] text-sm"
            : "h-14 rounded-[14px] bg-[#ccff00] text-base"
        )}
        onClick={onPrimary}
        disabled={!isConnected || isPending || !amountStr || !onRobinhood}
      >
        {cta}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-[#0a0a0a] text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirm mint</DialogTitle>
            <DialogDescription className="text-white/45">
              {amountStr} {assetLabel(payWith)}
              {usdHint != null
                ? ` · ≈ $${usdHint.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : ""}
              {entryFee > 0n ? ` · +$${fmtUsdg(entryFee)} entry` : ""}
            </DialogDescription>
          </DialogHeader>
          <p
            role="note"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-amber-100/90"
          >
            This action can result in loss of funds. Markets move, ownership is set at
            reveal, and deposits are not risk-free.
          </p>
          <DialogFooter className="border-0 bg-transparent sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#ccff00] text-black hover:brightness-110"
              disabled={isPending}
              onClick={() => void onConfirm()}
            >
              {isPending ? "Minting…" : "Confirm mint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
