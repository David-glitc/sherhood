"use client"

import { useState } from "react"
import { useWriteContract } from "wagmi"
import { potAbi } from "@/lib/contracts"

/** Early exit while Funding (5% fee) or full refund when Cancelled. */
export function useExitCard() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()

  const run = async (
    pot: `0x${string}`,
    tokenId: bigint,
    functionName: "earlyExit" | "refund"
  ) => {
    setIsPending(true)
    try {
      await writeContractAsync({
        address: pot,
        abi: potAbi,
        functionName,
        args: [tokenId],
      })
    } finally {
      setIsPending(false)
    }
  }

  const earlyExit = (pot: `0x${string}`, tokenId: bigint) => run(pot, tokenId, "earlyExit")
  const refund = (pot: `0x${string}`, tokenId: bigint) => run(pot, tokenId, "refund")

  return { earlyExit, refund, isPending }
}
