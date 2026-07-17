"use client"

import { useState } from "react"
import { useWriteContract } from "wagmi"
import { parseEther } from "viem"
import { toast } from "sonner"
import {
  ERC20_ABI,
  USDG_ADDRESS,
  potFactoryConfig,
  potCardConfig,
  marketplaceConfig,
} from "@/lib/contracts"
import { robinhood } from "@/lib/chain"
import { useRobinhoodChain } from "@/hooks/use-robinhood-chain"

export function useCreateCommunityPot() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()
  const { ensureRobinhood } = useRobinhoodChain()

  const create = async (params: {
    fundingGoal: string
    durationHours: string
    minDeposit: string
    creationFee: bigint
  }) => {
    setIsPending(true)
    try {
      const ready = await ensureRobinhood()
      if (!ready) {
        toast.error("Connect wallet on Robinhood Chain")
        return
      }
      if (params.creationFee > 0n) {
        await writeContractAsync({
          chainId: robinhood.id,
          address: USDG_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [potFactoryConfig.address, params.creationFee],
        })
      }
      const hours = Math.max(1, Math.floor(Number(params.durationHours)))
      await writeContractAsync({
        chainId: robinhood.id,
        ...potFactoryConfig,
        functionName: "createCommunityPot",
        args: [
          parseEther(params.fundingGoal),
          BigInt(hours * 3600),
          parseEther(params.minDeposit),
          0n,
          0n,
        ],
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed"
      toast.error(msg.slice(0, 120))
    } finally {
      setIsPending(false)
    }
  }

  return { create, isPending }
}

export function useMarketplaceTrade() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()
  const { ensureRobinhood } = useRobinhoodChain()

  const list = async (tokenId: bigint, priceUsdg: string) => {
    setIsPending(true)
    try {
      await ensureRobinhood()
      await writeContractAsync({
        chainId: robinhood.id,
        ...potCardConfig,
        functionName: "approve",
        args: [marketplaceConfig.address, tokenId],
      })
      await writeContractAsync({
        chainId: robinhood.id,
        ...marketplaceConfig,
        functionName: "list",
        args: [tokenId, parseEther(priceUsdg)],
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message.slice(0, 120) : "List failed")
    } finally {
      setIsPending(false)
    }
  }

  const buy = async (tokenId: bigint, price: bigint) => {
    setIsPending(true)
    try {
      await ensureRobinhood()
      await writeContractAsync({
        chainId: robinhood.id,
        address: USDG_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [marketplaceConfig.address, price],
      })
      await writeContractAsync({
        chainId: robinhood.id,
        ...marketplaceConfig,
        functionName: "buy",
        args: [tokenId],
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message.slice(0, 120) : "Buy failed")
    } finally {
      setIsPending(false)
    }
  }

  const cancel = async (tokenId: bigint) => {
    setIsPending(true)
    try {
      await ensureRobinhood()
      await writeContractAsync({
        chainId: robinhood.id,
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
