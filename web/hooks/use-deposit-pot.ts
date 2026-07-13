"use client"

import { useState } from "react"
import { useWriteContract } from "wagmi"
import { parseEther } from "viem"
import { ERC20_ABI, USDG_ADDRESS, WETH_ADDRESS, potAbi, entryRouterConfig } from "@/lib/contracts"

export type PayAsset = "USDG" | "ETH" | "WETH"

export function useDepositPot() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()

  const deposit = async (
    pot: `0x${string}`,
    amount: bigint,
    entryFee: bigint,
    payWith: PayAsset = "USDG",
    ethValue?: string,
    minUsdgOut: bigint = 0n
  ) => {
    setIsPending(true)
    try {
      if (payWith === "USDG") {
        const pull = amount + entryFee
        await writeContractAsync({
          address: USDG_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [pot, pull],
        })
        await writeContractAsync({
          address: pot,
          abi: potAbi,
          functionName: "deposit",
          args: [amount],
        })
        return
      }

      if (payWith === "ETH") {
        const value = parseEther(ethValue || "0")
        await writeContractAsync({
          ...entryRouterConfig,
          functionName: "depositWithETH",
          args: [pot, minUsdgOut],
          value,
        })
        return
      }

      const wethAmount = parseEther(ethValue || "0")
      await writeContractAsync({
        address: WETH_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [entryRouterConfig.address, wethAmount],
      })
      await writeContractAsync({
        ...entryRouterConfig,
        functionName: "depositWithWETH",
        args: [pot, wethAmount, minUsdgOut],
      })
    } finally {
      setIsPending(false)
    }
  }

  return { deposit, isPending }
}
