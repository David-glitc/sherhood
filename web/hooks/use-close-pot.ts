"use client"

import { useCallback, useState } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { potAbi } from "@/lib/contracts"
import { robinhood } from "@/lib/chain"

/** Permissionless `close()` / `cancel()` once the pot is ready on-chain. */
export function useClosePot() {
  const { chainId } = useAccount()
  const { writeContractAsync, data: hash, isPending: writing, reset } = useWriteContract()
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash })
  const [error, setError] = useState<string | null>(null)

  const onRobinhood = chainId === robinhood.id

  const close = useCallback(
    async (pot: `0x${string}`) => {
      setError(null)
      if (!onRobinhood) throw new Error("Switch to Robinhood Chain")
      try {
        const tx = await writeContractAsync({
          address: pot,
          abi: potAbi,
          functionName: "close",
          args: [],
        })
        return tx
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Close failed"
        setError(msg)
        throw e
      }
    },
    [onRobinhood, writeContractAsync]
  )

  const cancel = useCallback(
    async (pot: `0x${string}`) => {
      setError(null)
      if (!onRobinhood) throw new Error("Switch to Robinhood Chain")
      try {
        const tx = await writeContractAsync({
          address: pot,
          abi: potAbi,
          functionName: "cancel",
          args: [],
        })
        return tx
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Cancel failed"
        setError(msg)
        throw e
      }
    },
    [onRobinhood, writeContractAsync]
  )

  return {
    close,
    cancel,
    isPending: writing || confirming,
    hash,
    error,
    reset,
    onRobinhood,
  }
}
