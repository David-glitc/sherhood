"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import {
  SHRH_ADDRESS,
  SHRH_FLAP_URL,
  SHRH_SYMBOL,
  SHRH_UNISWAP_BUY_URL,
} from "@/lib/protocol"
import { cn } from "@/lib/utils"

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Copied")
  } catch {
    toast.error("Copy failed")
  }
}

/** Compact $SHERD buy — Flap + Uniswap only. */
export function ShrhBuyWidget({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { address, connector } = useAccount()
  const [adding, setAdding] = useState(false)

  const addToken = useCallback(async () => {
    const provider = await connector?.getProvider?.()
    if (!provider || typeof provider !== "object" || !("request" in provider)) {
      toast.message("Add $SHERD in your wallet")
      return
    }
    setAdding(true)
    try {
      await (
        provider as { request: (args: { method: string; params: unknown }) => Promise<unknown> }
      ).request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: SHRH_ADDRESS,
            symbol: SHRH_SYMBOL,
            decimals: 18,
            image: `${typeof window !== "undefined" ? window.location.origin : ""}/brand-lockup-hood.png`,
          },
        },
      })
      toast.success("Added")
    } catch {
      toast.message("Add $SHERD in your wallet")
    } finally {
      setAdding(false)
    }
  }, [connector])

  return (
    <div className={cn("space-y-3", className)}>
      <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        <a
          href={SHRH_FLAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#ccff00] text-sm font-semibold text-black transition hover:brightness-110"
        >
          Flap
        </a>
        <a
          href={SHRH_UNISWAP_BUY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-white transition hover:border-[#ccff00]/40 hover:text-[#ccff00]"
        >
          Uniswap
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => copy(SHRH_ADDRESS)}
        >
          CA
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={!address || adding}
          onClick={addToken}
        >
          {adding ? "…" : "Add"}
        </Button>
      </div>
    </div>
  )
}
