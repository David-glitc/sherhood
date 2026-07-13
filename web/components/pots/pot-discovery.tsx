"use client"

import { useMemo, useState } from "react"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potFactoryConfig, potAbi, entryRouterConfig } from "@/lib/contracts"
import { useDepositPot, type PayAsset } from "@/hooks/use-deposit-pot"
import {
  POT_STATUSES,
  deadlineLabel,
  fmtUsdg,
  tokenLabel,
  type PotView,
} from "@/hooks/use-pots"
import { Button } from "@/components/ui/button"

function usePotAddresses() {
  const { data, isLoading } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
  })
  return {
    pots: (data as `0x${string}`[] | undefined) ?? [],
    isLoading,
  }
}

function usePotView(address: `0x${string}`): PotView | null {
  const { data } = useReadContracts({
    contracts: [
      { address, abi: potAbi, functionName: "targetToken" },
      { address, abi: potAbi, functionName: "fundingGoal" },
      { address, abi: potAbi, functionName: "deadline" },
      { address, abi: potAbi, functionName: "minDeposit" },
      { address, abi: potAbi, functionName: "entryFee" },
      { address, abi: potAbi, functionName: "status" },
      { address, abi: potAbi, functionName: "totalDeposited" },
      { address, abi: potAbi, functionName: "participantCount" },
      { address, abi: potAbi, functionName: "assetAmount" },
      { address, abi: potAbi, functionName: "fundingProgressBps" },
    ],
  })

  return useMemo(() => {
    if (!data || data.some((r) => r.status !== "success")) return null
    return {
      address,
      targetToken: data[0].result as `0x${string}`,
      fundingGoal: data[1].result as bigint,
      deadline: data[2].result as bigint,
      minDeposit: data[3].result as bigint,
      entryFee: data[4].result as bigint,
      status: Number(data[5].result),
      totalDeposited: data[6].result as bigint,
      participantCount: data[7].result as bigint,
      assetAmount: data[8].result as bigint,
      progressBps: data[9].result as bigint,
    }
  }, [address, data])
}

function PotCardUi({
  address,
  isConnected,
}: {
  address: `0x${string}`
  isConnected: boolean
}) {
  const pot = usePotView(address)
  const { deposit, isPending } = useDepositPot()
  const [amountStr, setAmountStr] = useState("")
  const [payWith, setPayWith] = useState<PayAsset>("ETH")

  if (!pot) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
    )
  }

  const status = POT_STATUSES[pot.status] ?? "Unknown"
  const isFunding = pot.status === 0
  const progress = Math.min(100, Number(pot.progressBps) / 100)
  const min = Number(pot.minDeposit) / 1e18
  const routerReady =
    entryRouterConfig.address !== "0x0000000000000000000000000000000000000000"

  const onDeposit = async () => {
    if (!amountStr) return
    if (payWith === "USDG") {
      const parsed = Number(amountStr)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      const amount = BigInt(Math.floor(parsed * 1e18))
      await deposit(pot.address, amount, pot.entryFee, "USDG")
    } else {
      await deposit(pot.address, 0n, pot.entryFee, payWith, amountStr, 0n)
    }
    setAmountStr("")
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-transparent p-6 transition duration-300 hover:border-sherhood/40">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sherhood/10 blur-3xl transition group-hover:bg-sherhood/20" />

      <div className="relative mb-3 flex items-center justify-between">
        <span className="inline-flex rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          {tokenLabel(pot.targetToken)}
        </span>
        <span
          className={`text-xs font-medium ${
            isFunding ? "text-sherhood" : pot.status === 3 ? "text-amber-300" : "text-zinc-500"
          }`}
        >
          {status}
        </span>
      </div>

      <h3 className="relative text-2xl font-semibold tracking-tight text-zinc-50">
        {tokenLabel(pot.targetToken)} Pot
      </h3>
      <p className="relative mt-1 text-sm text-zinc-500">
        Deposit → mystery card → reveal your ownership slice.
      </p>

      <div className="relative mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
          <span>
            {fmtUsdg(pot.totalDeposited)} / {fmtUsdg(pot.fundingGoal)} USDG
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-sherhood transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-zinc-600">Min</p>
          <p className="text-zinc-200">{fmtUsdg(pot.minDeposit)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-600">People</p>
          <p className="text-zinc-200">{Number(pot.participantCount)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-600">Deadline</p>
          <p className="text-zinc-200">{deadlineLabel(pot.deadline)}</p>
        </div>
        {pot.entryFee > 0n && (
          <div>
            <p className="text-xs text-zinc-600">Entry fee</p>
            <p className="text-zinc-200">{fmtUsdg(pot.entryFee)}</p>
          </div>
        )}
      </div>

      {isFunding && (
        <div className="relative mt-5 space-y-3">
          <div className="flex gap-1 rounded-xl border border-white/10 bg-black/50 p-1">
            {(["ETH", "WETH", "USDG"] as PayAsset[]).map((asset) => {
              const disabled = asset !== "USDG" && !routerReady
              return (
                <button
                  key={asset}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPayWith(asset)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    payWith === asset
                      ? "bg-sherhood text-black"
                      : "text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                  }`}
                >
                  {asset}
                </button>
              )
            })}
          </div>
          <input
            type="number"
            min={payWith === "USDG" ? min : 0}
            step="any"
            placeholder={payWith === "USDG" ? `USDG (min ${min})` : `${payWith} amount`}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-sherhood"
          />
          {payWith !== "USDG" && (
            <p className="text-[11px] text-zinc-600">
              Auto-swaps to USDG via Uniswap. Router fee skimmed on the fly.
            </p>
          )}
          <Button
            className="w-full rounded-xl bg-sherhood text-sm font-bold text-black hover:opacity-90"
            onClick={onDeposit}
            disabled={!isConnected || isPending || !amountStr}
          >
            {!isConnected
              ? "Connect Wallet"
              : isPending
                ? "Joining..."
                : `Join with ${payWith}`}
          </Button>
        </div>
      )}

      {pot.status >= 2 && pot.assetAmount > 0n && (
        <div className="relative mt-4 rounded-xl border border-sherhood/20 bg-sherhood/5 p-3 text-center text-xs text-sherhood">
          Held: {fmtUsdg(pot.assetAmount)} {tokenLabel(pot.targetToken)}
        </div>
      )}
    </div>
  )
}

export function PotDiscovery() {
  const { isConnected } = useAccount()
  const { pots, isLoading } = usePotAddresses()
  const zeroFactory =
    potFactoryConfig.address === "0x0000000000000000000000000000000000000000"

  return (
    <div className="space-y-8">
      {zeroFactory && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          Set <code className="text-amber-100">NEXT_PUBLIC_POT_FACTORY_ADDRESS</code> after RH
          deploy to load live pots.
        </div>
      )}

      {!isLoading && pots.length === 0 && !zeroFactory && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-12 text-center">
          <h2 className="text-xl font-semibold text-zinc-300">No active pots</h2>
          <p className="mt-2 text-sm text-zinc-500">Platform pots appear here when they open.</p>
        </div>
      )}

      {isLoading && !zeroFactory && (
        <div className="flex items-center justify-center py-20 text-sm text-zinc-500">
          Loading pots...
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pots.map((addr) => (
          <PotCardUi key={addr} address={addr} isConnected={isConnected} />
        ))}
      </div>
    </div>
  )
}
