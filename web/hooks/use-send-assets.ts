"use client"

import { useCallback, useState } from "react"
import { getAddress, isAddress, parseEther, parseUnits } from "viem"
import { useAccount, useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { potCardConfig, USDG_ADDRESS } from "@/lib/contracts"
import { robinhood } from "@/lib/chain"

const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const

const nftTransferAbi = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const

export type SendAssetKind = "USDG" | "ETH" | "SHERD"

export function useSendAssets() {
  const { address, chainId, isConnected } = useAccount()
  const { writeContractAsync, isPending: writing } = useWriteContract()
  const { sendTransactionAsync, isPending: sendingEth } = useSendTransaction()
  const [hash, setHash] = useState<`0x${string}` | undefined>()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const onRobinhood = chainId === robinhood.id
  const isPending = writing || sendingEth || confirming

  const sendUsdg = useCallback(
    async (to: string, amountDollars: string) => {
      if (!address) throw new Error("Connect wallet")
      if (!onRobinhood) throw new Error("Switch to Robinhood Chain")
      if (!isAddress(to)) throw new Error("Invalid recipient")
      const amt = Number(amountDollars)
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter an amount")
      const value = parseUnits(amt.toFixed(6), 6)
      const tx = await writeContractAsync({
        address: USDG_ADDRESS,
        abi: erc20TransferAbi,
        functionName: "transfer",
        args: [getAddress(to), value],
        chainId: robinhood.id,
      })
      setHash(tx)
      return tx
    },
    [address, onRobinhood, writeContractAsync]
  )

  const sendEth = useCallback(
    async (to: string, amountEth: string) => {
      if (!address) throw new Error("Connect wallet")
      if (!onRobinhood) throw new Error("Switch to Robinhood Chain")
      if (!isAddress(to)) throw new Error("Invalid recipient")
      const amt = Number(amountEth)
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter an amount")
      const tx = await sendTransactionAsync({
        to: getAddress(to),
        value: parseEther(amountEth),
        chainId: robinhood.id,
      })
      setHash(tx)
      return tx
    },
    [address, onRobinhood, sendTransactionAsync]
  )

  const sendSherd = useCallback(
    async (to: string, tokenId: bigint) => {
      if (!address) throw new Error("Connect wallet")
      if (!onRobinhood) throw new Error("Switch to Robinhood Chain")
      if (!isAddress(to)) throw new Error("Invalid recipient")
      if (potCardConfig.address === "0x0000000000000000000000000000000000000000") {
        throw new Error("PotCard not configured")
      }
      const tx = await writeContractAsync({
        address: potCardConfig.address,
        abi: nftTransferAbi,
        functionName: "safeTransferFrom",
        args: [address, getAddress(to), tokenId],
        chainId: robinhood.id,
      })
      setHash(tx)
      return tx
    },
    [address, onRobinhood, writeContractAsync]
  )

  return {
    isConnected,
    onRobinhood,
    isPending,
    isSuccess,
    hash,
    sendUsdg,
    sendEth,
    sendSherd,
  }
}
