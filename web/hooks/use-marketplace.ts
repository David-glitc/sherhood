"use client"

import { useState } from "react"
import { useAccount, usePublicClient, useWriteContract } from "wagmi"
import { parseEther, parseEventLogs, type Hash } from "viem"
import { toast } from "sonner"
import {
  ERC20_ABI,
  USDG_ADDRESS,
  WETH_ADDRESS,
  potFactoryConfig,
  potCardConfig,
  marketplaceConfig,
} from "@/lib/contracts"
import { robinhood } from "@/lib/chain"
import { useRobinhoodChain } from "@/hooks/use-robinhood-chain"
import { PROTOCOL_DEFAULTS } from "@/lib/basket-stocks"
import {
  SWAP_ROUTER_ADDRESS,
  SWAP_ROUTER02_ABI,
  WETH_DEPOSIT_ABI,
  WETH_USDG_POOL_FEE,
} from "@/lib/create-fee"
import { usdgAmountFromDollars, usdgAmountFromDollarsOrZero } from "@/lib/usdg"
import { registerNamedPool } from "@/lib/basket-name"

export type CreateFeeAsset = "USDG" | "ETH"

async function persistPoolName(address: string, name: string, creator?: string) {
  registerNamedPool(address, name)
  try {
    await fetch("/api/pools/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, name, creator }),
    })
  } catch {
    /* offline */
  }
}

function potFromReceipt(receipt: { logs: unknown[] }): `0x${string}` | null {
  try {
    const logs = parseEventLogs({
      abi: potFactoryConfig.abi,
      eventName: "PotCreated",
      logs: receipt.logs as never,
    })
    return (logs[0]?.args as { pot?: `0x${string}` } | undefined)?.pot ?? null
  } catch {
    return null
  }
}

export function useCreateCommunityPot() {
  const [isPending, setIsPending] = useState(false)
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: robinhood.id })
  const { ensureRobinhood } = useRobinhoodChain()

  const create = async (params: {
    name: string
    fundingGoal: string
    durationHours: string
    minDeposit: string
    creationFee: bigint
    payFeeWith?: CreateFeeAsset
    ethForFee?: string
    sponsored?: boolean
  }): Promise<`0x${string}` | null> => {
    setIsPending(true)
    try {
      const hours = Math.floor(Number(params.durationHours))
      if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
        toast.error("Funding window must be between 1 hour and 30 days")
        return null
      }
      const name = params.name.trim()
      if (name.length < 2 || name.length > 48) {
        toast.error("Pool name must be 2–48 characters")
        return null
      }

      if (params.sponsored) {
        if (!address) {
          toast.error("Connect wallet")
          return null
        }
        const res = await fetch("/api/create-sponsored", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creator: address,
            fundingGoal: params.fundingGoal,
            durationHours: params.durationHours,
            minDeposit: params.minDeposit,
          }),
        })
        const json = (await res.json()) as { error?: string; pot?: string }
        if (!res.ok) {
          toast.error(json.error?.slice(0, 120) || "Sponsored create failed")
          return null
        }
        if (json.pot) {
          await persistPoolName(json.pot, name, address)
          toast.success(`Created ${name}`)
          return json.pot as `0x${string}`
        }
        toast.success("Pool created (sponsored)")
        return null
      }

      const ready = await ensureRobinhood()
      if (!ready) {
        toast.error("Connect wallet on Robinhood Chain")
        return null
      }

      if (params.creationFee > 0n) {
        if (params.payFeeWith === "ETH") {
          if (!address || !params.ethForFee) {
            toast.error("Enter ETH amount to cover the creation fee")
            return null
          }
          const ethIn = parseEther(params.ethForFee)
          if (ethIn <= 0n) {
            toast.error("ETH amount must be greater than 0")
            return null
          }

          await writeContractAsync({
            chainId: robinhood.id,
            address: WETH_ADDRESS,
            abi: WETH_DEPOSIT_ABI,
            functionName: "deposit",
            value: ethIn,
          })
          await writeContractAsync({
            chainId: robinhood.id,
            address: WETH_ADDRESS,
            abi: WETH_DEPOSIT_ABI,
            functionName: "approve",
            args: [SWAP_ROUTER_ADDRESS, ethIn],
          })
          await writeContractAsync({
            chainId: robinhood.id,
            address: SWAP_ROUTER_ADDRESS,
            abi: SWAP_ROUTER02_ABI,
            functionName: "exactInputSingle",
            args: [
              {
                tokenIn: WETH_ADDRESS,
                tokenOut: USDG_ADDRESS,
                fee: WETH_USDG_POOL_FEE,
                recipient: address,
                amountIn: ethIn,
                amountOutMinimum: params.creationFee,
                sqrtPriceLimitX96: 0n,
              },
            ],
          })
        }

        await writeContractAsync({
          chainId: robinhood.id,
          address: USDG_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [potFactoryConfig.address, params.creationFee],
        })
      }

      const hash = (await writeContractAsync({
        chainId: robinhood.id,
        ...potFactoryConfig,
        functionName: "createCommunityPot",
        args: [
          usdgAmountFromDollars(Number(params.fundingGoal), "fundingGoal"),
          BigInt(hours * 3600),
          usdgAmountFromDollars(Number(params.minDeposit), "minDeposit"),
          usdgAmountFromDollarsOrZero(Number(PROTOCOL_DEFAULTS.entryFeeUsdg), "entryFee"),
          0n,
        ],
      })) as Hash

      let pot: `0x${string}` | null = null
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        pot = potFromReceipt(receipt)
      }
      if (pot) {
        await persistPoolName(pot, name, address)
        toast.success(`Created ${name}`)
      } else {
        toast.success("Pool created")
      }
      return pot
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed"
      toast.error(msg.slice(0, 120))
      return null
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
        args: [tokenId, usdgAmountFromDollars(Number(priceUsdg), "listPrice")],
      })
      toast.success(`Listed #${tokenId} on Sherhood Market`, {
        description: "OpenSea is a separate marketplace — list there from the OpenSea link.",
      })
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message.slice(0, 120) : "List failed")
      return false
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
      toast.success(`Bought Sherd #${tokenId}`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message.slice(0, 120) : "Buy failed")
      return false
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
