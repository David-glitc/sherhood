"use client"

import { useState } from "react"
import { useAccount, usePublicClient, useWriteContract } from "wagmi"
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
import { playMintSound } from "@/lib/sfx"

export type PayAsset = "USDG" | "ETH" | "WETH" | "SHERD"

export type DepositResult = {
  tokenId?: bigint
}

function friendlyRevert(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes("beneficiary")) {
    return "Connect your wallet — deposit needs a recipient address."
  }
  if (lower.includes("pot: router") || lower.includes("entry: bad pot")) {
    return "This pool isn’t wired to the entry router — try USDG or another pool."
  }
  if (lower.includes("below min") || lower.includes("entry: below min")) {
    return "Deposit too small after swap — raise the ETH amount (must clear the pool minimum)."
  }
  if (lower.includes("too little received")) {
    return "Swap slippage too tight — raise Max slippage or lower Min USDG out."
  }
  if (lower.includes("cannot cover entry")) {
    return "Swap output cannot cover the card entry fee — send more ETH."
  }
  if (lower.includes("chain") || lower.includes("network")) {
    return "Switch to Robinhood Chain (4663) in your wallet"
  }
  return msg.slice(0, 140)
}

export function useDepositPot() {
  const [isPending, setIsPending] = useState(false)
  const { address } = useAccount()
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
      if (!address) {
        toast.error("Connect wallet")
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
          account: address,
        })
        hash = await writeContractAsync({
          chainId: robinhood.id,
          address: pot,
          abi: potAbi,
          functionName: "deposit",
          args: [amount],
          account: address,
        })
      } else if (payWith === "ETH" || payWith === "SHERD") {
        // SHERD: UI converts token amount → ETH at live mark, then settles via EntryRouter.
        const value = parseEther(ethValue || "0")
        if (value <= 0n) {
          toast.error(
            payWith === "SHERD"
              ? "Enter a $SHERD amount greater than 0"
              : "Enter an ETH amount greater than 0"
          )
          return {}
        }
        if (publicClient) {
          try {
            await publicClient.estimateContractGas({
              ...entryRouterConfig,
              functionName: "depositWithETH",
              args: [pot, minUsdgOut],
              value,
              account: address,
            })
          } catch (simErr) {
            const simMsg = simErr instanceof Error ? simErr.message : String(simErr)
            toast.error(friendlyRevert(simMsg))
            return {}
          }
        }
        hash = await writeContractAsync({
          chainId: robinhood.id,
          ...entryRouterConfig,
          functionName: "depositWithETH",
          args: [pot, minUsdgOut],
          value,
          account: address,
        })
      } else {
        const wethAmount = parseEther(ethValue || "0")
        if (wethAmount <= 0n) {
          toast.error("Enter a WETH amount greater than 0")
          return {}
        }
        await writeContractAsync({
          chainId: robinhood.id,
          address: WETH_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [entryRouterConfig.address, wethAmount],
          account: address,
        })
        hash = await writeContractAsync({
          chainId: robinhood.id,
          ...entryRouterConfig,
          functionName: "depositWithWETH",
          args: [pot, wethAmount, minUsdgOut],
          account: address,
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
      const tokenId = last?.args?.tokenId
      if (tokenId != null) playMintSound()
      return { tokenId }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed"
      toast.error(friendlyRevert(msg))
      return {}
    } finally {
      setIsPending(false)
    }
  }

  /** Parse user dollar input → on-chain USDG units (6 decimals). */
  const parseDepositAmount = (dollars: number) => dollarsToProtocol(dollars)

  return { deposit, parseDepositAmount, isPending, onRobinhood }
}
