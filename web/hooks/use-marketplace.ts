"use client"

import { useState } from "react"
import { useWriteContract } from "wagmi"
import { parseEther } from "viem"
import {
  ERC20_ABI,
  USDG_ADDRESS,
  potFactoryConfig,
  potCardConfig,
  marketplaceConfig,
} from "@/lib/contracts"

export function useCreateCommunityPot() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()

  const create = async (params: {
    targetToken: `0x${string}`
    swapFee: number
    fundingGoal: string
    durationDays: string
    minDeposit: string
    entryFee: string
    protocolFeeBps: string
    creationFee: bigint
  }) => {
    setIsPending(true)
    try {
      if (params.creationFee > 0n) {
        await writeContractAsync({
          address: USDG_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [potFactoryConfig.address, params.creationFee],
        })
      }
      await writeContractAsync({
        ...potFactoryConfig,
        functionName: "createCommunityPot",
        args: [
          params.targetToken,
          params.swapFee,
          parseEther(params.fundingGoal),
          BigInt(Math.floor(Number(params.durationDays) * 86400)),
          parseEther(params.minDeposit),
          parseEther(params.entryFee || "0"),
          BigInt(params.protocolFeeBps || "100"),
        ],
      })
    } finally {
      setIsPending(false)
    }
  }

  return { create, isPending }
}

export function useMarketplaceTrade() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()

  const list = async (tokenId: bigint, priceUsdg: string) => {
    setIsPending(true)
    try {
      await writeContractAsync({
        ...potCardConfig,
        functionName: "approve",
        args: [marketplaceConfig.address, tokenId],
      })
      await writeContractAsync({
        ...marketplaceConfig,
        functionName: "list",
        args: [tokenId, parseEther(priceUsdg)],
      })
    } finally {
      setIsPending(false)
    }
  }

  const buy = async (tokenId: bigint, price: bigint) => {
    setIsPending(true)
    try {
      await writeContractAsync({
        address: USDG_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [marketplaceConfig.address, price],
      })
      await writeContractAsync({
        ...marketplaceConfig,
        functionName: "buy",
        args: [tokenId],
      })
    } finally {
      setIsPending(false)
    }
  }

  const cancel = async (tokenId: bigint) => {
    setIsPending(true)
    try {
      await writeContractAsync({
        ...marketplaceConfig,
        functionName: "cancel",
        args: [tokenId],
      })
    } finally {
      setIsPending(false)
    }
  }

  return { list, buy, cancel, isPending }
}
