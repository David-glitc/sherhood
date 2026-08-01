"use client"

import { useState } from "react"
import { useAccount, useSignMessage } from "wagmi"
import { toast } from "sonner"
import { useDepositPot, type PayAsset } from "@/hooks/use-deposit-pot"
import { useRobinhoodChain } from "@/hooks/use-robinhood-chain"
import { useEthUsd } from "@/hooks/use-eth-usd"
import { useSherdQuote } from "@/hooks/use-sherd-quote"
import { registerNamedPool } from "@/lib/basket-name"
import { minUsdgOutFor, DEFAULT_SLIPPAGE_PCT } from "@/components/pots/slippage-control"
import {
  INSTANT_MINT_DEFAULT_USD,
  type InstantMintAmountUsd,
  instantMintMessage,
} from "@/lib/instant-mint"

async function persistPoolName(address: string, name: string, creator?: string) {
  registerNamedPool(address, name)
  try {
    await fetch("/api/pools/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, name, creator }),
    })
  } catch {
    /* offline */
  }
}

export type InstantMintPhase =
  | "idle"
  | "signing"
  | "creating"
  | "depositing"
  | "revealing"
  | "done"

export type InstantMintPay = Extract<PayAsset, "USDG" | "ETH" | "SHERD">

export function useInstantMint() {
  const [phase, setPhase] = useState<InstantMintPhase>("idle")
  const [isPending, setIsPending] = useState(false)
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { deposit, parseDepositAmount, isPending: depositPending } = useDepositPot()
  const { ensureRobinhood } = useRobinhoodChain()
  const { ethUsd } = useEthUsd()
  const sherdQuote = useSherdQuote()

  const run = async (params: {
    name: string
    amountUsd?: InstantMintAmountUsd
    payWith?: InstantMintPay
  }): Promise<{ pot: `0x${string}`; tokenId?: bigint } | null> => {
    setIsPending(true)
    try {
      if (!address) {
        toast.error("Connect wallet")
        return null
      }
      const ready = await ensureRobinhood()
      if (!ready) {
        toast.error("Switch to Robinhood Chain")
        return null
      }

      const amountUsd = params.amountUsd ?? INSTANT_MINT_DEFAULT_USD
      const payWith = params.payWith ?? "SHERD"
      const name = params.name.trim()
      const issuedAt = Date.now()
      const message = instantMintMessage({
        minter: address,
        amountUsd,
        name,
        issuedAt,
      })

      setPhase("signing")
      const signature = await signMessageAsync({ message })

      setPhase("creating")
      const createRes = await fetch("/api/instant-mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minter: address,
          amountUsd,
          name,
          issuedAt,
          signature,
        }),
      })
      const created = (await createRes.json()) as {
        error?: string
        pot?: string
      }
      if (!createRes.ok || !created.pot) {
        toast.error(created.error?.slice(0, 140) || "Instant mint create failed")
        return null
      }
      const pot = created.pot as `0x${string}`
      await persistPoolName(pot, name, address)

      setPhase("depositing")
      let ethValue: string | undefined
      let minOut = 0n
      if (payWith === "ETH") {
        if (!ethUsd || ethUsd <= 0) {
          toast.error("ETH price unavailable")
          return null
        }
        ethValue = ((amountUsd / ethUsd) * 1.04).toFixed(8)
        minOut = minUsdgOutFor(amountUsd, DEFAULT_SLIPPAGE_PCT)
      } else if (payWith === "SHERD") {
        const priceUsd = sherdQuote?.priceUsd
        const priceNative = sherdQuote?.priceNative
        if (!priceUsd || priceUsd <= 0 || !priceNative || priceNative <= 0) {
          toast.error("Waiting for $SHERD price…")
          return null
        }
        const sherdAmount = amountUsd / priceUsd
        ethValue = (sherdAmount * priceNative * 1.04).toFixed(8)
        minOut = minUsdgOutFor(amountUsd, DEFAULT_SLIPPAGE_PCT)
      }

      const { tokenId } = await deposit(
        pot,
        payWith === "USDG" ? parseDepositAmount(amountUsd) : 0n,
        0n,
        payWith,
        ethValue,
        minOut
      )

      setPhase("revealing")
      let revealed = false
      for (let i = 0; i < 6; i++) {
        const adv = await fetch("/api/ops/advance-pool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pot }),
        })
        const json = (await adv.json()) as {
          statusAfter?: number
          error?: string
        }
        if (adv.ok && json.statusAfter === 3) {
          revealed = true
          break
        }
        if (!adv.ok && json.error) {
          toast.message(json.error.slice(0, 120))
        }
        await new Promise((r) => setTimeout(r, 2_800))
      }

      setPhase("done")
      if (revealed) {
        toast.success("Instant Mint complete — Sherd revealed")
      } else {
        toast.message("Pool funded — finish reveal on the vault page")
      }
      return { pot, tokenId }
    } catch (e) {
      toast.error(e instanceof Error ? e.message.slice(0, 140) : "Instant mint failed")
      return null
    } finally {
      setIsPending(false)
      setPhase("idle")
    }
  }

  return { run, isPending: isPending || depositPending, phase }
}
