"use client"

import { useMemo } from "react"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potFactoryConfig, potCardConfig } from "@/lib/contracts"
import { RARITIES, ownershipPct } from "@/hooks/use-pots"

type CardRow = {
  tokenId: bigint
  owner: string
  depositAmount: bigint
  ownershipWeight: bigint
  rarity: number
  revealed: boolean
  claimed: boolean
}

const ACHIEVEMENTS = [
  {
    id: "first-card",
    title: "First Reveal",
    desc: "Own at least one revealed card",
    check: (mine: CardRow[]) => mine.some((c) => c.revealed),
  },
  {
    id: "legendary",
    title: "Legendary Pull",
    desc: "Hold a Legendary card",
    check: (mine: CardRow[]) => mine.some((c) => c.rarity === 4),
  },
  {
    id: "collector-5",
    title: "Collector",
    desc: "Own 5+ cards",
    check: (mine: CardRow[]) => mine.length >= 5,
  },
  {
    id: "claimer",
    title: "Diamond Hands",
    desc: "Claim an asset share from a revealed pot",
    check: (mine: CardRow[]) => mine.some((c) => c.claimed),
  },
  {
    id: "diversified",
    title: "Multi-Pot",
    desc: "Cards from 2+ different pots",
    check: (_mine: CardRow[]) => false,
  },
]

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount()

  const { data: potsData } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
  })
  const pots = (potsData as `0x${string}`[] | undefined) ?? []

  const { data: idBatches } = useReadContracts({
    contracts: pots.map((pot) => ({
      ...potCardConfig,
      functionName: "potTokenIds",
      args: [pot],
    })),
    query: { enabled: pots.length > 0 },
  })

  const allIds = useMemo(() => {
    const ids: { tokenId: bigint; pot: `0x${string}` }[] = []
    if (!idBatches) return ids
    idBatches.forEach((batch, i) => {
      if (batch.status === "success" && Array.isArray(batch.result)) {
        for (const id of batch.result as bigint[]) {
          ids.push({ tokenId: id, pot: pots[i] })
        }
      }
    })
    return ids
  }, [idBatches, pots])

  const { data: ownership } = useReadContracts({
    contracts: allIds.flatMap(({ tokenId }) => [
      { ...potCardConfig, functionName: "ownerOf", args: [tokenId] },
      { ...potCardConfig, functionName: "getCard", args: [tokenId] },
    ]),
    query: { enabled: allIds.length > 0 },
  })

  const rows = useMemo(() => {
    const out: (CardRow & { pot: `0x${string}` })[] = []
    if (!ownership) return out
    for (let i = 0; i < allIds.length; i++) {
      const ownerRes = ownership[i * 2]
      const cardRes = ownership[i * 2 + 1]
      if (ownerRes?.status !== "success" || cardRes?.status !== "success") continue
      const raw = cardRes.result as unknown
      const depositAmount = (Array.isArray(raw) ? raw[1] : (raw as { depositAmount: bigint }).depositAmount) as bigint
      const ownershipWeight = (
        Array.isArray(raw) ? raw[2] : (raw as { ownershipWeight: bigint }).ownershipWeight
      ) as bigint
      const rarity = Number(Array.isArray(raw) ? raw[3] : (raw as { rarity: number }).rarity)
      const revealed = Boolean(Array.isArray(raw) ? raw[4] : (raw as { revealed: boolean }).revealed)
      const claimed = Boolean(Array.isArray(raw) ? raw[5] : (raw as { claimed: boolean }).claimed)
      out.push({
        tokenId: allIds[i].tokenId,
        pot: allIds[i].pot,
        owner: ownerRes.result as string,
        depositAmount,
        ownershipWeight,
        rarity,
        revealed,
        claimed,
      })
    }
    return out
  }, [ownership, allIds])

  const byOwner = useMemo(() => {
    const map = new Map<
      string,
      { cards: number; legendaries: number; ownershipSum: number; deposits: number }
    >()
    for (const r of rows) {
      const key = r.owner.toLowerCase()
      const cur = map.get(key) ?? { cards: 0, legendaries: 0, ownershipSum: 0, deposits: 0 }
      cur.cards += 1
      if (r.rarity === 4) cur.legendaries += 1
      if (r.revealed) cur.ownershipSum += Number(r.ownershipWeight)
      cur.deposits += Number(r.depositAmount)
      map.set(key, cur)
    }
    return [...map.entries()]
      .map(([owner, stats]) => ({ owner, ...stats }))
      .sort((a, b) => b.ownershipSum - a.ownershipSum || b.cards - a.cards)
  }, [rows])

  const mine = useMemo(() => {
    if (!address) return [] as (CardRow & { pot: `0x${string}` })[]
    return rows.filter((r) => r.owner.toLowerCase() === address.toLowerCase())
  }, [rows, address])

  const diversifiedOk = new Set(mine.map((c) => c.pot.toLowerCase())).size >= 2

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-100">Leaderboards</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Ranked by total revealed ownership weight across all pots.
      </p>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">Top collectors</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Cards</th>
                <th className="px-4 py-3">Legendary</th>
                <th className="px-4 py-3">Σ Ownership</th>
              </tr>
            </thead>
            <tbody>
              {byOwner.slice(0, 20).map((row, i) => (
                <tr key={row.owner} className="border-t border-zinc-800 text-zinc-300">
                  <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.owner.slice(0, 6)}…{row.owner.slice(-4)}
                    {address && row.owner.toLowerCase() === address.toLowerCase() && (
                      <span className="ml-2 text-robinhood">you</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{row.cards}</td>
                  <td className="px-4 py-3">{row.legendaries}</td>
                  <td className="px-4 py-3 text-robinhood">
                    {ownershipPct(BigInt(Math.floor(row.ownershipSum)))}%
                  </td>
                </tr>
              ))}
              {byOwner.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    No cards indexed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">Achievements</h2>
        {!isConnected ? (
          <p className="text-sm text-zinc-500">Connect wallet to see your badges.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const unlocked =
                a.id === "diversified" ? diversifiedOk : a.check(mine)
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-5 ${
                    unlocked
                      ? "border-robinhood/40 bg-robinhood/5"
                      : "border-zinc-800 bg-zinc-900/40 opacity-60"
                  }`}
                >
                  <h3 className="font-bold text-zinc-100">{a.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{a.desc}</p>
                  <p className="mt-3 text-xs uppercase tracking-wider text-zinc-500">
                    {unlocked ? "Unlocked" : "Locked"}
                  </p>
                </div>
              )
            })}
          </div>
        )}
        {isConnected && (
          <p className="mt-4 text-xs text-zinc-600">
            You hold {mine.length} card(s)
            {mine.some((c) => c.revealed)
              ? ` · rarities: ${[...new Set(mine.filter((c) => c.revealed).map((c) => RARITIES[c.rarity]))].join(", ")}`
              : ""}
          </p>
        )}
      </section>
    </div>
  )
}
