"use client"

import { useMemo } from "react"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potFactoryConfig, potCardConfig, potAbi, marketplaceConfig } from "@/lib/contracts"
import { useClaimCard } from "@/hooks/use-claim-card"
import { useMarketplaceTrade } from "@/hooks/use-marketplace"
import { RARITIES, fmtUsdg, ownershipPct, tokenLabel } from "@/hooks/use-pots"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const RARITY_STYLE: Record<string, string> = {
  Unrevealed: "border-zinc-700 text-zinc-400",
  Common: "border-zinc-600 text-zinc-300",
  Rare: "border-sky-500/50 text-sky-300",
  Epic: "border-violet-500/50 text-violet-300",
  Legendary: "border-amber-400/60 text-amber-300",
}

export default function InventoryPage() {
  const { address, isConnected } = useAccount()
  const { claim, isPending: claimPending } = useClaimCard()
  const { list, isPending: listPending } = useMarketplaceTrade()
  const [listPrices, setListPrices] = useState<Record<string, string>>({})

  const { data: potsData } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
    query: { enabled: isConnected },
  })
  const pots = (potsData as `0x${string}`[] | undefined) ?? []

  const { data: idBatches } = useReadContracts({
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

  const { data: ownership } = useReadContracts({
    contracts: allTokenIds.flatMap((tokenId) => [
      { ...potCardConfig, functionName: "ownerOf", args: [tokenId] },
      { ...potCardConfig, functionName: "getCard", args: [tokenId] },
    ]),
    query: { enabled: isConnected && allTokenIds.length > 0 },
  })

  const myCards = useMemo(() => {
    if (!ownership || !address) return []
    const cards: {
      tokenId: bigint
      pot: `0x${string}`
      depositAmount: bigint
      ownershipWeight: bigint
      rarity: number
      revealed: boolean
      claimed: boolean
    }[] = []

    for (let i = 0; i < allTokenIds.length; i++) {
      const ownerRes = ownership[i * 2]
      const cardRes = ownership[i * 2 + 1]
      if (ownerRes?.status !== "success" || cardRes?.status !== "success") continue
      const owner = ownerRes.result as string
      if (owner.toLowerCase() !== address.toLowerCase()) continue

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
      const pot = (Array.isArray(raw) ? raw[0] : (raw as { pot: `0x${string}` }).pot) as `0x${string}`
      const depositAmount = (Array.isArray(raw) ? raw[1] : (raw as { depositAmount: bigint }).depositAmount) as bigint
      const ownershipWeight = (
        Array.isArray(raw) ? raw[2] : (raw as { ownershipWeight: bigint }).ownershipWeight
      ) as bigint
      const rarity = Number(Array.isArray(raw) ? raw[3] : (raw as { rarity: number }).rarity)
      const revealed = Boolean(Array.isArray(raw) ? raw[4] : (raw as { revealed: boolean }).revealed)
      const claimed = Boolean(Array.isArray(raw) ? raw[5] : (raw as { claimed: boolean }).claimed)

      cards.push({
        tokenId: allTokenIds[i],
        pot,
        depositAmount,
        ownershipWeight,
        rarity,
        revealed,
        claimed,
      })
    }
    return cards
  }, [ownership, address, allTokenIds])

  const { data: targetTokens } = useReadContracts({
    contracts: myCards.map((c) => ({
      address: c.pot,
      abi: potAbi,
      functionName: "targetToken",
    })),
    query: { enabled: myCards.length > 0 },
  })

  const { data: potStatuses } = useReadContracts({
    contracts: myCards.map((c) => ({
      address: c.pot,
      abi: potAbi,
      functionName: "status",
    })),
    query: { enabled: myCards.length > 0 },
  })

  if (!isConnected || !address) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-300">Inventory</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Connect your wallet to view mystery and revealed ownership cards.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-zinc-100">Your Cards</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Claim asset shares after reveal, or list cards on the marketplace.
      </p>

      {myCards.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">No cards yet. Join a pot to mint your first mystery card.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myCards.map((card, idx) => {
            const rarity = RARITIES[card.rarity] ?? "Unrevealed"
            const target =
              targetTokens?.[idx]?.status === "success"
                ? (targetTokens[idx].result as string)
                : undefined
            const potStatus =
              potStatuses?.[idx]?.status === "success" ? Number(potStatuses[idx].result) : -1
            const canClaim = card.revealed && !card.claimed && potStatus === 3
            const idKey = String(card.tokenId)

            return (
              <div
                key={idKey}
                className={`rounded-xl border bg-zinc-900/50 p-5 ${RARITY_STYLE[rarity]}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider">{rarity}</span>
                  <span className="text-xs text-zinc-500">#{idKey}</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-100">
                  {target ? tokenLabel(target) : "Pot"} Card
                </h3>
                <div className="mt-4 space-y-2 text-sm text-zinc-400">
                  <div className="flex justify-between">
                    <span>Deposit</span>
                    <span className="text-zinc-200">{fmtUsdg(card.depositAmount)} USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ownership</span>
                    <span className="font-semibold text-robinhood">
                      {card.revealed ? `${ownershipPct(card.ownershipWeight)}%` : "???"}
                    </span>
                  </div>
                  {card.claimed && (
                    <div className="flex justify-between">
                      <span>Status</span>
                      <span className="text-amber-300">Claimed</span>
                    </div>
                  )}
                </div>

                {!card.revealed && (
                  <p className="mt-4 text-center text-xs text-zinc-500">Mystery — awaits pot reveal</p>
                )}

                {canClaim && (
                  <Button
                    className="mt-4 w-full bg-robinhood font-semibold text-black hover:opacity-90"
                    disabled={claimPending}
                    onClick={() => claim(card.pot, card.tokenId)}
                  >
                    {claimPending ? "Claiming..." : "Claim Asset Share"}
                  </Button>
                )}

                {marketplaceConfig.address !==
                  "0x0000000000000000000000000000000000000000" && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="List price (USDG)"
                      value={listPrices[idKey] ?? ""}
                      onChange={(e) =>
                        setListPrices((p) => ({ ...p, [idKey]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-robinhood"
                    />
                    <Button
                      variant="outline"
                      className="w-full border-zinc-700 text-zinc-200"
                      disabled={listPending || !listPrices[idKey]}
                      onClick={() => list(card.tokenId, listPrices[idKey])}
                    >
                      {listPending ? "Listing..." : "List on Marketplace"}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
