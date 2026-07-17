"use client"

import { useAccount, useSwitchChain } from "wagmi"
import { robinhood } from "@/lib/chain"

export function useRobinhoodChain() {
  const { chainId, isConnected } = useAccount()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const onRobinhood = chainId === robinhood.id

  const ensureRobinhood = async () => {
    if (!isConnected) return false
    if (onRobinhood) return true
    await switchChainAsync({ chainId: robinhood.id })
    return true
  }

  return {
    chainId,
    onRobinhood,
    isSwitching,
    ensureRobinhood,
    robinhood,
  }
}
