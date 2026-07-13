"use client"

import { useState } from "react"
import { useWriteContract } from "wagmi"
import { raffleManagerConfig, USDG_ADDRESS } from "@/lib/contracts"

const ERC20_APPROVE_ABI = [
  {
    type: "function" as const,
    name: "approve",
    inputs: [
      { type: "address" as const },
      { type: "uint256" as const },
    ],
    outputs: [{ type: "bool" as const }],
    stateMutability: "nonpayable" as const,
  },
] as const

export function useEnterRound() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()

  const enter = async (roundId: number, entryFee: bigint) => {
    setIsPending(true)
    try {
      await writeContractAsync({
        address: USDG_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [raffleManagerConfig.address, entryFee],
      })

      await writeContractAsync({
        ...raffleManagerConfig,
        functionName: "enter",
        args: [BigInt(roundId)],
      })
    } finally {
      setIsPending(false)
    }
  }

  return { enter, isPending }
}
