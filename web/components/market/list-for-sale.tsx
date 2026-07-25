"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { OpenSeaLink } from "@/components/share/opensea-link"
import { useOpenSeaList } from "@/hooks/use-opensea-list"
import { cn } from "@/lib/utils"

type ListForSaleProps = {
  tokenId: bigint
  className?: string
}

/**
 * Single list path: Seaport via OpenSea SDK.
 * That is what makes the listing show on OpenSea — CardMarketplace.list does not.
 */
export function ListForSale({ tokenId, className }: ListForSaleProps) {
  const { listOnOpenSea, isPending, canListInApp } = useOpenSeaList()
  const [eth, setEth] = useState("")

  return (
    <div className={cn("rounded-xl border border-white/10 bg-black/40 p-3", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ccff00]">
        List for sale
      </p>
      <p className="mt-1 text-[11px] leading-snug text-white/40">
        Posts to OpenSea (Seaport · ETH). Same listing shows in Market and on OpenSea.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          min="0"
          step="0.0001"
          inputMode="decimal"
          placeholder="Price in ETH"
          aria-label="Listing price in ETH"
          value={eth}
          onChange={(e) => setEth(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 text-sm tabular-nums text-white placeholder:text-white/30"
        />
        <Button
          type="button"
          className="h-10 shrink-0 bg-[#ccff00] font-semibold text-black hover:opacity-90"
          disabled={isPending || !eth}
          onClick={() => void listOnOpenSea(tokenId, eth)}
        >
          {isPending ? "Listing…" : canListInApp ? "List" : "List on OpenSea"}
        </Button>
      </div>
      <div className="mt-2">
        <OpenSeaLink tokenId={String(tokenId)} label="View on OpenSea" className="w-full" />
      </div>
    </div>
  )
}
