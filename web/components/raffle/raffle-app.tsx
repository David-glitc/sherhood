"use client"

import { useReadContract, useAccount } from "wagmi"
import { raffleManagerConfig } from "@/lib/contracts"
import { RoundCard } from "@/components/raffle/round-card"
import { useEnterRound } from "@/hooks/use-enter-round"
import { parseRound } from "@/hooks/use-raffle"

function useRoundData(roundId: bigint) {
  const { data: roundData } = useReadContract({
    ...raffleManagerConfig,
    functionName: "getRound",
    args: [roundId],
  })
  const { data: entries } = useReadContract({
    ...raffleManagerConfig,
    functionName: "getEntryCount",
    args: [roundId],
  })
  return { roundData, entryCount: Number(entries || 0n) }
}

function RoundContainer({ roundId, isConnected }: { roundId: bigint; isConnected: boolean }) {
  const { roundData, entryCount } = useRoundData(roundId)
  const round = parseRound(roundData)
  const { enter, isPending } = useEnterRound()

  if (!round) return null

  return (
    <RoundCard
      round={round}
      roundId={Number(roundId)}
      onEnter={() => enter(Number(roundId), round.entryFee)}
      isPending={isPending}
      entryCount={entryCount}
      isConnected={isConnected}
    />
  )
}

export function RaffleApp() {
  const { isConnected } = useAccount()

  const { data: ids } = useReadContract({
    ...raffleManagerConfig,
    functionName: "getRoundIds",
    args: [],
  })

  const roundIds: bigint[] = (ids || []) as bigint[]
  const isLoading = !ids

  return (
    <div className="space-y-8">
      {roundIds.length === 0 && !isLoading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-zinc-300">No Active Rounds</h2>
          <p className="mt-2 text-sm text-zinc-500">
            A new round will open soon. Check back.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-sm text-zinc-500">
          Loading rounds...
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roundIds.map((id) => (
          <RoundContainer key={Number(id)} roundId={id} isConnected={isConnected} />
        ))}
      </div>
    </div>
  )
}
