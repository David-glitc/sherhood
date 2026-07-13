"use client"

import Link from "next/link"
import { PotDiscovery } from "@/components/pots/pot-discovery"

export default function AppPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Investment Pots</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Deposit USDG. Mint a mystery card. Reveal your fractional ownership of the pool.
        </p>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <Link href="/create" className="text-robinhood hover:underline">
            Create community pot
          </Link>
          <Link href="/docs/allocation" className="text-zinc-500 hover:text-zinc-300 hover:underline">
            Allocation EV
          </Link>
          <Link href="/marketplace" className="text-zinc-500 hover:text-zinc-300 hover:underline">
            Marketplace
          </Link>
        </div>
      </div>

      <PotDiscovery />
    </div>
  )
}
