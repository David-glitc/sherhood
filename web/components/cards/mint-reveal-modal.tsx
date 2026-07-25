"use client"

import { useEffect } from "react"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { Button } from "@/components/ui/button"

type MintRevealModalProps = {
  open: boolean
  tokenId?: bigint
  stockLabel?: string
  onClose: () => void
  onViewInventory?: () => void
}

export function MintRevealModal({
  open,
  tokenId,
  stockLabel,
  onClose,
  onViewInventory,
}: MintRevealModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal
      aria-labelledby="mint-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 text-center">
          <p className="font-heading text-xs uppercase tracking-[0.35em] text-sherhood">Minted</p>
          <h2 id="mint-modal-title" className="mt-2 text-2xl font-bold text-white">
            Sherd secured
          </h2>
          <p className="mt-2 text-sm text-white/45">
            Sealed until the pool reveals ownership.
          </p>
        </div>

        <div className="mint-card-float">
          <PotNftCard
            rarityIndex={0}
            revealed={false}
            tokenId={tokenId}
            stockLabel={stockLabel}
            size="lg"
          />
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            className="bg-sherhood font-semibold text-black hover:opacity-90"
            onClick={() => (onViewInventory ? onViewInventory() : onClose())}
          >
            View Inventory
          </Button>
          <Button variant="outline" className="border-zinc-700 text-zinc-200" onClick={onClose}>
            Keep Browsing
          </Button>
        </div>
      </div>
    </div>
  )
}
