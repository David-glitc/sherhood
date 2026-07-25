"use client"

import { SHRH_LAUNCHED, SHRH_SYMBOL } from "@/lib/protocol"
import { cn } from "@/lib/utils"

/** Tiny $SHERD luck badge — no essay. */
export function ShrhLuckPill({ className = "" }: { className?: string }) {
  return (
    <span
      title={
        SHRH_LAUNCHED
          ? `Hold $${SHRH_SYMBOL} at fund + reveal for a luck boost`
          : `$${SHRH_SYMBOL} luck — launching soon`
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1 text-[11px] font-semibold text-primary",
        className
      )}
    >
      <span className="rounded bg-primary px-1 py-px text-[9px] font-black text-primary-foreground">
        ${SHRH_SYMBOL}
      </span>
      luck
    </span>
  )
}
