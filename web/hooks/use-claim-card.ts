"use client"

import { useState } from "react"
import { useWriteContract } from "wagmi"
import { potAbi } from "@/lib/contracts"

export function useClaimCard() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()

  const claim = async (pot: `0x${string}`, tokenId: bigint) => {
    setIsPending(true)
    try {
      await writeContractAsync({
        address: pot,
        abi: potAbi,
        functionName: "claim",
        args: [tokenId],
      })
    } finally {
      setIsPending(false)
    }
  }

  return { claim, isPending }
}
