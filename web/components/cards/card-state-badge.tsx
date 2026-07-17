"use client"

import { cn } from "@/lib/utils"

type CardStateBadgeProps = {
  revealed: boolean
  claimed?: boolean
  className?: string
}

/** Clear Unrevealed / Revealed (and Claimed) badge for inventory + trade grids. */
export function CardStateBadge({ revealed, claimed = false, className }: CardStateBadgeProps) {
  if (claimed) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200",
          className
        )}
      >
        Claimed
      </span>
    )
  }

  if (revealed) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-[#ccff00]/35 bg-[#ccff00]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ccff00]",
          className
        )}
      >
        Revealed
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70",
        className
      )}
    >
      Unrevealed
    </span>
  )
}
