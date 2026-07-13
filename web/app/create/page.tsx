"use client"

import { useState } from "react"
import { useAccount, useReadContract } from "wagmi"
import { potFactoryConfig } from "@/lib/contracts"
import { useCreateCommunityPot } from "@/hooks/use-marketplace"
import { fmtUsdg } from "@/hooks/use-pots"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CreatePotPage() {
  const { isConnected } = useAccount()
  const { create, isPending } = useCreateCommunityPot()
  const { data: creationFee } = useReadContract({
    ...potFactoryConfig,
    functionName: "creationFee",
    args: [],
  })

  const [form, setForm] = useState({
    targetToken: "",
    swapFee: "3000",
    fundingGoal: "10000",
    durationDays: "7",
    minDeposit: "10",
    entryFee: "0",
    protocolFeeBps: "100",
  })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.targetToken.startsWith("0x") || form.targetToken.length !== 42) return
    await create({
      ...form,
      targetToken: form.targetToken as `0x${string}`,
      swapFee: Number(form.swapFee),
      creationFee: (creationFee as bigint) ?? 0n,
    })
  }

  const field = (key: keyof typeof form, label: string, hint?: string) => (
    <label className="block space-y-1.5">
      <span className="text-sm text-zinc-400">{label}</span>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-robinhood"
      />
      {hint && <span className="text-xs text-zinc-600">{hint}</span>}
    </label>
  )

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-bold text-zinc-100">Create Community Pot</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Anyone can launch a pot. Creation fee goes to the protocol treasury.
        {creationFee !== undefined && (
          <> Fee: <span className="text-robinhood">{fmtUsdg(creationFee as bigint)} USDG</span>.</>
        )}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {field("targetToken", "Target token address", "ERC-20 to acquire after funding")}
        {field("swapFee", "Uniswap pool fee (e.g. 3000 = 0.3%)")}
        {field("fundingGoal", "Funding goal (USDG)")}
        {field("durationDays", "Duration (days)")}
        {field("minDeposit", "Minimum deposit (USDG)")}
        {field("entryFee", "Entry fee per deposit (USDG)")}
        {field("protocolFeeBps", "Protocol fee bps (100 = 1%)")}

        <Button
          type="submit"
          className="w-full bg-robinhood font-semibold text-black hover:opacity-90"
          disabled={!isConnected || isPending}
        >
          {!isConnected ? "Connect Wallet" : isPending ? "Creating..." : "Create Pot"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Read the{" "}
        <Link href="/docs/allocation" className="text-zinc-400 underline hover:text-zinc-200">
          allocation EV docs
        </Link>{" "}
        before launching.
      </p>
    </div>
  )
}
