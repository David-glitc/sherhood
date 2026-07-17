"use client"

import { useMemo } from "react"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potAbi, potCardConfig, potFactoryConfig } from "@/lib/contracts"
import { parseHoldings, type PotHolding } from "@/hooks/use-pots"

export type MyCard = {
  tokenId: bigint
  pot: `0x${string}`
  depositAmount: bigint
  ownershipWeight: bigint
  rarity: number
  revealed: boolean
  claimed: boolean
}

export type MyPotInfo = {
  status: number
  totalDeposited: bigint
  holdings: PotHolding[]
}

/** All cards owned by the connected wallet plus per-pot status/holdings. */
export function useMyCards() {
  const { address, isConnected } = useAccount()

  const { data: potsData, isLoading: potsLoading } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
    query: { enabled: isConnected },
  })
  const pots = (potsData as `0x${string}`[] | undefined) ?? []

  const { data: idBatches, isLoading: idsLoading } = useReadContracts({
    contracts: pots.map((pot) => ({
      ...potCardConfig,
      functionName: "potTokenIds",
      args: [pot],
    })),
    query: { enabled: isConnected && pots.length > 0 },
  })

  const allTokenIds = useMemo(() => {
    const ids: bigint[] = []
    if (!idBatches) return ids
    for (const batch of idBatches) {
      if (batch.status === "success" && Array.isArray(batch.result)) {
        for (const id of batch.result as bigint[]) ids.push(id)
      }
    }
    return ids
  }, [idBatches])

  const { data: ownership, isLoading: ownershipLoading } = useReadContracts({
    contracts: allTokenIds.flatMap((tokenId) => [
      { ...potCardConfig, functionName: "ownerOf", args: [tokenId] },
      { ...potCardConfig, functionName: "getCard", args: [tokenId] },
    ]),
    query: { enabled: isConnected && allTokenIds.length > 0 },
  })

  const cards = useMemo(() => {
    if (!ownership || !address) return [] as MyCard[]
    const out: MyCard[] = []
    for (let i = 0; i < allTokenIds.length; i++) {
      const ownerRes = ownership[i * 2]
      const cardRes = ownership[i * 2 + 1]
      if (ownerRes?.status !== "success" || cardRes?.status !== "success") continue
      if ((ownerRes.result as string).toLowerCase() !== address.toLowerCase()) continue

      const raw = cardRes.result as
        | {
            pot: `0x${string}`
            depositAmount: bigint
            ownershipWeight: bigint
            rarity: number
            revealed: boolean
            claimed: boolean
          }
        | unknown[]
      const pick = <T,>(idx: number, key: string): T =>
        (Array.isArray(raw) ? raw[idx] : (raw as Record<string, unknown>)[key]) as T

      out.push({
        tokenId: allTokenIds[i],
        pot: pick<`0x${string}`>(0, "pot"),
        depositAmount: pick<bigint>(1, "depositAmount"),
        ownershipWeight: pick<bigint>(2, "ownershipWeight"),
        rarity: Number(pick<number>(3, "rarity")),
        revealed: Boolean(pick<boolean>(4, "revealed")),
        claimed: Boolean(pick<boolean>(5, "claimed")),
      })
    }
    return out
  }, [ownership, address, allTokenIds])

  const myPots = useMemo(
    () => Array.from(new Set(cards.map((c) => c.pot))),
    [cards]
  )

  const { data: potReads } = useReadContracts({
    contracts: myPots.flatMap((pot) => [
      { address: pot, abi: potAbi, functionName: "status" },
      { address: pot, abi: potAbi, functionName: "totalDeposited" },
      { address: pot, abi: potAbi, functionName: "getHoldings" },
    ]),
    query: { enabled: myPots.length > 0 },
  })

  const potInfo = useMemo(() => {
    const map = new Map<string, MyPotInfo>()
    if (!potReads) return map
    for (let i = 0; i < myPots.length; i++) {
      const statusRes = potReads[i * 3]
      const totalRes = potReads[i * 3 + 1]
      const holdingsRes = potReads[i * 3 + 2]
      const holdingsRaw =
        holdingsRes?.status === "success"
          ? (holdingsRes.result as [string[], bigint[]])
          : undefined
      map.set(myPots[i].toLowerCase(), {
        status: statusRes?.status === "success" ? Number(statusRes.result) : -1,
        totalDeposited:
          totalRes?.status === "success" ? (totalRes.result as bigint) : 0n,
        holdings: parseHoldings(
          holdingsRaw?.[0] as `0x${string}`[] | undefined,
          holdingsRaw?.[1]
        ),
      })
    }
    return map
  }, [potReads, myPots])

  return {
    address,
    isConnected,
    cards,
    potInfo,
    isLoading: potsLoading || idsLoading || ownershipLoading,
  }
}
