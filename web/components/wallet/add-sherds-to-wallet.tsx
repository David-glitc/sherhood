"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { POT_CARD_ADDRESS } from "@/lib/contracts"
import { SITE_URL } from "@/lib/seo"

type EthereumProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>
}

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined
  return (window as Window & { ethereum?: EthereumProvider }).ethereum
}

/** Prompt wallet to watch the Sherd (PotCard) ERC-721 collection. */
export async function watchSherdCollection(): Promise<boolean> {
  const ethereum = getEthereum()
  if (!ethereum) {
    throw new Error("No wallet detected")
  }
  if (POT_CARD_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("PotCard not configured")
  }

  try {
    await ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC721",
        options: {
          address: POT_CARD_ADDRESS,
          symbol: "SHERD",
          image: `${SITE_URL}/cards/mystery.jpg`,
        },
      },
    })
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/unsupported|ERC721|not supported/i.test(msg)) {
      throw new Error(
        "This wallet doesn’t support adding NFTs via watchAsset. Import the Sherd contract manually in your NFT gallery."
      )
    }
    throw e
  }
}

export function AddSherdsToWalletButton({
  className,
  size = "sm",
}: {
  className?: string
  size?: "default" | "sm" | "lg"
}) {
  const [pending, setPending] = useState(false)

  const onClick = useCallback(async () => {
    setPending(true)
    try {
      await watchSherdCollection()
      toast.success("Sherd collection added — check your wallet NFTs")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add collection")
    } finally {
      setPending(false)
    }
  }, [])

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      disabled={pending}
      onClick={onClick}
    >
      {pending ? "Adding…" : "Add Sherds to wallet"}
    </Button>
  )
}
