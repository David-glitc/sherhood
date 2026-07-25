"use client"

import { useCallback, useState } from "react"
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from "wagmi"
import { toast } from "sonner"
import { potCardConfig } from "@/lib/contracts"
import { robinhood } from "@/lib/chain"
import { openseaTokenUrl } from "@/lib/protocol"
import { useRobinhoodChain } from "@/hooks/use-robinhood-chain"

/**
 * List a Sherd from the app → OpenSea Seaport.
 * This is the only listing path so Market and OpenSea stay in sync.
 * (CardMarketplace.list is not indexed by OpenSea.)
 */
export function useOpenSeaList() {
  const [isPending, setIsPending] = useState(false)
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: robinhood.id })
  const { data: walletClient } = useWalletClient({ chainId: robinhood.id })
  const { ensureRobinhood } = useRobinhoodChain()

  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_OPENSEA_API_KEY?.trim() || ""
      : ""

  const listOnOpenSea = useCallback(
    async (tokenId: bigint, amountEth: string) => {
      const amt = Number(amountEth)
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error("Enter a valid ETH price")
        return false
      }
      if (!address) {
        toast.error("Connect wallet")
        return false
      }

      const ready = await ensureRobinhood()
      if (!ready) {
        toast.error("Switch to Robinhood Chain")
        return false
      }

      if (!apiKey) {
        toast.message("Opening OpenSea to finish listing", {
          description: "Set NEXT_PUBLIC_OPENSEA_API_KEY for in-app Seaport listings.",
        })
        window.open(openseaTokenUrl(tokenId), "_blank", "noopener,noreferrer")
        return false
      }

      if (!publicClient || !walletClient) {
        toast.error("Wallet not ready")
        return false
      }

      setIsPending(true)
      try {
        const { OpenSeaSDK, Chain } = await import("@opensea/sdk/viem")
        const sdk = new OpenSeaSDK(
          { publicClient, walletClient },
          {
            chain: Chain.Robinhood,
            apiKey,
          }
        )

        await sdk.createListing({
          asset: {
            tokenAddress: potCardConfig.address,
            tokenId: String(tokenId),
          },
          accountAddress: address,
          amount: amt,
          // Native ETH on Robinhood; Seaport — not CardMarketplace.list
          expirationTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        })

        toast.success(`Listed #${tokenId}`, {
          description: "Live on OpenSea — same listing feeds Sherhood Market.",
          action: {
            label: "View",
            onClick: () =>
              window.open(openseaTokenUrl(tokenId), "_blank", "noopener,noreferrer"),
          },
        })
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : "OpenSea list failed"
        toast.error(msg.slice(0, 140))
        return false
      } finally {
        setIsPending(false)
      }
    },
    [address, apiKey, ensureRobinhood, publicClient, walletClient]
  )

  return {
    listOnOpenSea,
    isPending,
    canListInApp: Boolean(apiKey),
  }
}
