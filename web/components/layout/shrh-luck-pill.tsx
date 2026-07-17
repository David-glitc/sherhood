"use client"

import { SHRH_LUCK_BOOST_PCT, SHRH_LUCK_ETH_TARGET, SHRH_LAUNCHED, SHRH_SYMBOL } from "@/lib/protocol"

export function ShrhLuckPill({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.08] px-3 py-2 text-xs font-semibold leading-5 text-primary ${className}`}
    >
      <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-black text-primary-foreground">
        {SHRH_SYMBOL}
      </span>
      {SHRH_LAUNCHED ? (
        <>
          Hold ~{SHRH_LUCK_ETH_TARGET} ETH of ${SHRH_SYMBOL} at deposit + reveal for +
          {SHRH_LUCK_BOOST_PCT}% luck
        </>
      ) : (
        <>${SHRH_SYMBOL} luck boost — coming soon (~{SHRH_LUCK_ETH_TARGET} ETH worth)</>
      )}
    </div>
  )
}
