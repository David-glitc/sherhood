"use client"

import type { Round } from "@/hooks/use-raffle"
import { ROUND_STATES } from "@/hooks/use-raffle"
import { Button } from "@/components/ui/button"
import { shortenAddress } from "@/lib/utils"

interface RoundCardProps {
  round: Round
  roundId: number
  onEnter: () => void
  isPending: boolean
  entryCount: number
  isConnected: boolean
}

function fmt(value: bigint): string {
  return (Number(value) / 1e18).toFixed(2)
}

function timeLeft(startTime: bigint, duration: bigint): string {
  const end = Number(startTime + duration) * 1000
  const now = Date.now()
  const diff = end - now
  if (diff <= 0) return "Ended"
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h ${m}m`
}

const TOKEN_NAMES: Record<string, string> = {
  "0x309fc0dD9cf7FC77DC9c8Ee3B68BFd06a7c226Bc": "NVDA",
  "0x95B73c5780437Ce92258f8074878287dFC8ed314": "AAPL",
  "0x62cbf96cE2eDbc9218135385B009bF596F51325C": "GOOG",
}

function tokenName(address: string): string {
  return TOKEN_NAMES[address.toLowerCase()] || shortenAddress(address)
}

export function RoundCard({ round, roundId, onEnter, isPending, entryCount, isConnected }: RoundCardProps) {
  const state = ROUND_STATES[round.state] || "Unknown"
  const isOpen = round.state === 0
  const isBought = round.state === 3
  const isFinal = round.state === 4

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-shadow hover:shadow-lg hover:shadow-robinhood/5">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
          Round #{roundId}
        </span>
        <span className={`text-xs font-medium ${isOpen ? "text-robinhood" : isFinal ? "text-zinc-600" : "text-amber-400"}`}>
          {state}
        </span>
      </div>

      <h3 className="text-lg font-bold text-zinc-100">
        {tokenName(round.targetToken)}
      </h3>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-zinc-400">
          <span>Entry</span>
          <span className="text-zinc-200">{fmt(round.entryFee)} USDG</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Pot</span>
          <span className="text-robinhood font-semibold">{fmt(round.totalUSDG)} USDG</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Entries</span>
          <span className="text-zinc-200">{entryCount}/{Number(round.maxEntries)}</span>
        </div>
        {isOpen && (
          <div className="flex justify-between text-zinc-400">
            <span>Time left</span>
            <span className="text-zinc-200">{timeLeft(round.startTime, round.duration)}</span>
          </div>
        )}
        <div className="flex justify-between text-zinc-400">
          <span>Winners</span>
          <span className="text-zinc-200">{Number(round.maxWinners)}</span>
        </div>
        {isOpen && (
          <div className="flex justify-between text-zinc-400">
            <span>Fee</span>
            <span className="text-zinc-200">{Number(round.feePercent) / 100}%</span>
          </div>
        )}
      </div>

      {isOpen && (
        <Button
          className="mt-5 w-full bg-robinhood text-sm font-semibold text-black shadow-lg shadow-robinhood/20 transition-all hover:opacity-90 hover:shadow-xl hover:shadow-robinhood/30"
          onClick={onEnter}
          disabled={!isConnected || isPending}
        >
          {!isConnected ? "Connect Wallet" : isPending ? "Entering..." : `Enter for ${fmt(round.entryFee)} USDG`}
        </Button>
      )}

      {isBought && (
        <div className="mt-4 rounded-lg border border-robinhood/20 bg-robinhood/5 p-3 text-center text-xs text-robinhood">
          Tokens bought: {fmt(round.tokenAmount)} {tokenName(round.targetToken)}
        </div>
      )}
    </div>
  )
}
