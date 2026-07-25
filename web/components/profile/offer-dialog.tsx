"use client"

import { useState } from "react"
import { useAccount, useSignMessage } from "wagmi"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { WalletButton } from "@/components/layout/wallet-button"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { cardOfferMessage } from "@/lib/card-offer"
import { POT_CARD_ADDRESS } from "@/lib/contracts"
import { ROBINHOOD_CHAIN_ID } from "@/lib/chain"

type OfferDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenId: bigint
  seller: string
  listPriceFmt?: string
  sealed: boolean
}

export function OfferDialog({
  open,
  onOpenChange,
  tokenId,
  seller,
  listPriceFmt,
  sealed,
}: OfferDialogProps) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [amount, setAmount] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!address) {
      toast.error("Connect wallet first")
      return
    }
    setPending(true)
    try {
      const amountUsdg = String(Number(amount))
      const nonce = String(Date.now())
      const payload = {
        tokenId: String(tokenId),
        seller,
        buyer: address,
        amountUsdg,
        nonce,
        card: POT_CARD_ADDRESS,
        chainId: ROBINHOOD_CHAIN_ID,
      }
      const signature = await signMessageAsync({
        message: cardOfferMessage(payload),
      })
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, signature }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || "Offer failed")
      toast.success(`Offer of $${amount} USDG recorded for #${tokenId}`)
      setAmount("")
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Offer failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-[#080808] sm:max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle>Make an offer</DialogTitle>
          <DialogDescription>
            Off-chain interest on Sherd #{String(tokenId)}
            {sealed ? " (sealed)" : " (revealed)"}
            {listPriceFmt ? ` · listed at $${listPriceFmt}` : ""}. Not escrowed — the seller
            can list at your price or reply off-app.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Connect to place an offer.</p>
            <WalletButton />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Offer <UsdgLogo size={12} />
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={listPriceFmt || "10"}
                className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:border-[#ccff00]/50"
              />
            </label>
            <Button
              type="button"
              className="w-full"
              disabled={pending || !amount}
              onClick={submit}
            >
              {pending ? "Sending…" : "Send offer"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
