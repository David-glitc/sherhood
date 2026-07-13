"use client"

import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { marketplaceConfig, potCardConfig, potAbi } from "@/lib/contracts"
import { useMarketplaceTrade } from "@/hooks/use-marketplace"
import { fmtUsdg, ownershipPct, RARITIES, tokenLabel } from "@/hooks/use-pots"
import { Button } from "@/components/ui/button"
import { useMemo } from "react"

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const { buy, cancel, isPending } = useMarketplaceTrade()

  const zero =
    marketplaceConfig.address === "0x0000000000000000000000000000000000000000"

  const { data: listingsData, isLoading } = useReadContract({
    ...marketplaceConfig,
    functionName: "getActiveListings",
    args: [],
    query: { enabled: !zero },
  })

  const { data: royaltyBps } = useReadContract({
    ...marketplaceConfig,
    functionName: "royaltyBps",
    args: [],
    query: { enabled: !zero },
  })

  const tokenIds = useMemo(() => {
    if (!listingsData) return [] as bigint[]
    const raw = listingsData as [bigint[], { seller: string; price: bigint; active: boolean }[]]
    return Array.isArray(raw[0]) ? raw[0] : []
  }, [listingsData])

  const items = useMemo(() => {
    if (!listingsData) return [] as { seller: `0x${string}`; price: bigint; active: boolean }[]
    const raw = listingsData as [bigint[], { seller: string; price: bigint; active: boolean }[]]
    return (raw[1] ?? []).map((x) => ({
      seller: x.seller as `0x${string}`,
      price: x.price,
      active: x.active,
    }))
  }, [listingsData])

  const { data: cards } = useReadContracts({
    contracts: tokenIds.map((id) => ({
      ...potCardConfig,
      functionName: "getCard",
      args: [id],
    })),
    query: { enabled: tokenIds.length > 0 },
  })

  const pots = useMemo(() => {
    if (!cards) return [] as (`0x${string}` | undefined)[]
    return cards.map((c) => {
      if (c.status !== "success") return undefined
      const raw = c.result as { pot: `0x${string}` } | unknown[]
      return (Array.isArray(raw) ? raw[0] : (raw as { pot: `0x${string}` }).pot) as `0x${string}`
    })
  }, [cards])

  const { data: targets } = useReadContracts({
    contracts: pots.filter(Boolean).map((pot) => ({
      address: pot!,
      abi: potAbi,
      functionName: "targetToken",
    })),
    query: { enabled: pots.some(Boolean) },
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-zinc-100">Marketplace</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Trade ownership cards. Protocol royalty:{" "}
          {royaltyBps !== undefined ? `${Number(royaltyBps) / 100}%` : "—"}
        </p>
      </div>

      {zero && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          Set <code>NEXT_PUBLIC_MARKETPLACE_ADDRESS</code> after deploying CardMarketplace.
        </div>
      )}

      {!zero && isLoading && (
        <p className="py-16 text-center text-sm text-zinc-500">Loading listings...</p>
      )}

      {!zero && !isLoading && tokenIds.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">No active listings. List a card from your inventory.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tokenIds.map((id, i) => {
          const item = items[i]
          if (!item?.active) return null
          const cardRaw = cards?.[i]?.status === "success" ? cards[i].result : null
          const weight = cardRaw
            ? Number(
                Array.isArray(cardRaw)
                  ? cardRaw[2]
                  : (cardRaw as { ownershipWeight: bigint }).ownershipWeight
              )
            : 0
          const rarityIdx = cardRaw
            ? Number(Array.isArray(cardRaw) ? cardRaw[3] : (cardRaw as { rarity: number }).rarity)
            : 0
          const revealed = cardRaw
            ? Boolean(Array.isArray(cardRaw) ? cardRaw[4] : (cardRaw as { revealed: boolean }).revealed)
            : false
          const targetIdx = pots.slice(0, i + 1).filter(Boolean).length - 1
          const target =
            targets?.[targetIdx]?.status === "success"
              ? (targets[targetIdx].result as string)
              : undefined
          const isMine =
            isConnected && address && item.seller.toLowerCase() === address.toLowerCase()

          return (
            <div key={String(id)} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-2 flex justify-between text-xs text-zinc-500">
                <span>#{String(id)}</span>
                <span>{RARITIES[rarityIdx] ?? "Card"}</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-100">
                {target ? tokenLabel(target) : "Pot"} Card
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Ownership:{" "}
                <span className="text-robinhood">
                  {revealed ? `${ownershipPct(BigInt(weight))}%` : "???"}
                </span>
              </p>
              <p className="mt-3 text-xl font-semibold text-zinc-100">{fmtUsdg(item.price)} USDG</p>
              <p className="mt-1 truncate text-xs text-zinc-600">{item.seller}</p>

              {isMine ? (
                <Button
                  className="mt-4 w-full border border-zinc-700"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => cancel(id)}
                >
                  Cancel listing
                </Button>
              ) : (
                <Button
                  className="mt-4 w-full bg-robinhood font-semibold text-black hover:opacity-90"
                  disabled={!isConnected || isPending}
                  onClick={() => buy(id, item.price)}
                >
                  {!isConnected ? "Connect Wallet" : isPending ? "Buying..." : "Buy"}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
