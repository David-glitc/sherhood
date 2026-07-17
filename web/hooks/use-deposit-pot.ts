"use client"

import { useState } from "react"
import { usePublicClient, useWriteContract } from "wagmi"
import { parseEther, parseEventLogs } from "viem"
import { toast } from "sonner"
import {
  ERC20_ABI,
  USDG_ADDRESS,
  WETH_ADDRESS,
  potAbi,
  entryRouterConfig,
  potCardConfig,
} from "@/lib/contracts"
import { robinhood } from "@/lib/chain"
import { useRobinhoodChain } from "@/hooks/use-robinhood-chain"
import { dollarsToProtocol } from "@/lib/usdg"

export type PayAsset = "USDG" | "ETH" | "WETH"

export type DepositResult = {
  tokenId?: bigint
}

export function useDepositPot() {
  const [isPending, setIsPending] = useState(false)
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: robinhood.id })
  const { ensureRobinhood, onRobinhood } = useRobinhoodChain()

  const deposit = async (
    pot: `0x${string}`,
    amount: bigint,
    entryFee: bigint,
    payWith: PayAsset = "USDG",
    ethValue?: string,
    minUsdgOut: bigint = 0n
  ): Promise<DepositResult> => {
    setIsPending(true)
    try {
      const ready = await ensureRobinhood()
      if (!ready) {
        toast.error("Connect wallet on Robinhood Chain")
        return {}
      }

      let hash: `0x${string}`

      if (payWith === "USDG") {
        const pull = amount + entryFee
        await writeContractAsync({
          chainId: robinhood.id,
          address: USDG_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [pot, pull],
        })
        hash = await writeContractAsync({
          chainId: robinhood.id,
          address: pot,
          abi: potAbi,
          functionName: "deposit",
          args: [amount],
        })
      } else if (payWith === "ETH") {
        const value = parseEther(ethValue || "0")
        hash = await writeContractAsync({
          chainId: robinhood.id,
          ...entryRouterConfig,
          functionName: "depositWithETH",
          args: [pot, minUsdgOut],
          value,
        })
      } else {
        const wethAmount = parseEther(ethValue || "0")
        await writeContractAsync({
          chainId: robinhood.id,
          address: WETH_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [entryRouterConfig.address, wethAmount],
        })
        hash = await writeContractAsync({
          chainId: robinhood.id,
          ...entryRouterConfig,
          functionName: "depositWithWETH",
          args: [pot, wethAmount, minUsdgOut],
        })
      }

      if (!publicClient) return {}
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      const logs = parseEventLogs({
        abi: potCardConfig.abi,
        eventName: "CardMinted",
        logs: receipt.logs,
      }) as { args: { tokenId?: bigint } }[]
      const last = logs[logs.length - 1]
      return { tokenId: last?.args?.tokenId }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed"
      if (msg.toLowerCase().includes("chain") || msg.toLowerCase().includes("network")) {
        toast.error("Switch to Robinhood Chain (4663) in your wallet")
      } else {
        toast.error(msg.slice(0, 120))
      }
      return {}
    } finally {
      setIsPending(false)
    }
  }

  /** Parse user dollar input → protocol units for pot.deposit */
  const parseDepositAmount = (dollars: number) => dollarsToProtocol(dollars)

  return { deposit, parseDepositAmount, isPending, onRobinhood }
}
