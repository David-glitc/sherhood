"use client"

import Image from "next/image"
import { cardArtForRarity } from "@/lib/card-art"
import { cn } from "@/lib/utils"

type PotNftCardProps = {
  rarityIndex: number
  revealed: boolean
  tokenId?: bigint | string
  stockLabel?: string
  ownershipPct?: string
  className?: string
  size?: "sm" | "md" | "lg"
  interactive?: boolean
}

const SIZE = {
  sm: "max-w-[148px]",
  md: "max-w-[240px]",
  lg: "max-w-[320px]",
} as const

export function PotNftCard({
  rarityIndex,
  revealed,
  tokenId,
  stockLabel,
  ownershipPct,
  className,
  size = "md",
  interactive = true,
}: PotNftCardProps) {
  const art = cardArtForRarity(rarityIndex, revealed)
  const foil = revealed && rarityIndex >= 3

  return (
    <div
      className={cn(
        "group relative mx-auto w-full",
        SIZE[size],
        interactive && "transition-transform duration-500 ease-out hover:scale-[1.035]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${art.glow}, transparent 68%)` }}
        aria-hidden
      />

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl shadow-2xl shadow-black/70 ring-1 ring-white/12",
          !revealed && "card-mystery-pulse"
        )}
      >
        <Image
          src={art.src}
          alt={`${art.label} Sherhood ownership card`}
          width={800}
          height={1200}
          className="h-auto w-full select-none"
          priority={size === "lg"}
          draggable={false}
          sizes="(max-width: 640px) 70vw, 320px"
        />

        {foil && (
          <div
            className="pointer-events-none absolute inset-0 card-foil-sheen mix-blend-soft-light opacity-40"
            aria-hidden
          />
        )}

        {(stockLabel || ownershipPct || tokenId !== undefined) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-3.5 pb-3.5 pt-14">
            {stockLabel && (
              <p className="font-heading text-center text-[13px] font-bold tracking-[0.08em] text-white">
                {stockLabel}
              </p>
            )}
            {ownershipPct && (
              <p
                className="mt-0.5 text-center text-xs font-semibold tracking-wide"
                style={{ color: art.accent }}
              >
                {ownershipPct} ownership
              </p>
            )}
            {tokenId !== undefined && (
              <p className="mt-1 text-center font-mono text-[10px] tracking-wider text-zinc-500">
                #{String(tokenId)} · {art.label}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
