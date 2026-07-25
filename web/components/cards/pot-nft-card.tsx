"use client"

import { useCallback, useRef, useState, type MouseEvent } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { cardArtForRarity } from "@/lib/card-art"
import { cn } from "@/lib/utils"

type PotNftCardProps = {
  rarityIndex: number
  revealed: boolean
  tokenId?: bigint | string
  stockLabel?: string
  ownershipPct?: string
  className?: string
  size?: "sm" | "md" | "lg" | "fill"
  interactive?: boolean
  tilt?: boolean
}

const SIZE = {
  sm: "w-[112px]",
  md: "w-[148px]",
  lg: "w-[200px]",
  fill: "w-full",
} as const

type TiltState = { rx: number; ry: number; gx: number; gy: number }
const REST: TiltState = { rx: 0, ry: 0, gx: 50, gy: 40 }

export function PotNftCard({
  rarityIndex,
  revealed,
  tokenId,
  stockLabel,
  ownershipPct,
  className,
  size = "md",
  interactive = true,
  tilt = true,
}: PotNftCardProps) {
  const art = cardArtForRarity(rarityIndex, revealed)
  const foil = revealed && rarityIndex >= 3
  const reduceMotion = useReducedMotion() ?? false
  const frameRef = useRef<HTMLDivElement>(null)
  const [tiltState, setTiltState] = useState<TiltState>(REST)
  const [tilting, setTilting] = useState(false)

  const pctLabel = ownershipPct
    ? ownershipPct.replace(/\s*ownership$/i, "").replace(/%$/, "").trim()
    : null
  const enableTilt = tilt && !reduceMotion

  const onMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!enableTilt || !frameRef.current) return
      const rect = frameRef.current.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      setTilting(true)
      setTiltState({
        rx: (0.5 - py) * 16,
        ry: (px - 0.5) * 20,
        gx: px * 100,
        gy: py * 100,
      })
    },
    [enableTilt]
  )

  const onLeave = useCallback(() => {
    setTilting(false)
    setTiltState(REST)
  }, [])

  return (
    <motion.div
      className={cn(
        "group relative shrink-0",
        size === "fill" ? "mx-0 w-full" : "mx-auto",
        SIZE[size],
        className
      )}
      style={{ perspective: 1000 }}
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(!reduceMotion && "card-idle-float")}
        style={{ animationPlayState: tilting ? "paused" : undefined }}
      >
        <div
          ref={frameRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className={cn("relative will-change-transform", enableTilt && "transform-gpu")}
          style={{
            transform: enableTilt
              ? `rotateX(${tiltState.rx}deg) rotateY(${tiltState.ry}deg) translateZ(0)`
              : undefined,
            transition: tilting
              ? "transform 60ms linear"
              : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-2 bottom-0 top-[8%] -z-10 rounded-2xl bg-black/70 blur-xl"
            style={{
              transform: enableTilt
                ? `translateZ(-28px) translateY(${8 + Math.abs(tiltState.rx) * 0.3}px) scale(0.92)`
                : "translateZ(-28px) translateY(8px) scale(0.92)",
              opacity: tilting ? 0.85 : 0.55,
            }}
          />

          <div
            className={cn(
              "relative aspect-[2/3] w-full overflow-hidden rounded-2xl",
              "shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.1)]",
              !revealed && "card-mystery-pulse",
              interactive &&
                !reduceMotion &&
                "transition-shadow duration-300 group-hover:shadow-[0_28px_55px_-14px_rgba(0,0,0,0.9),0_0_0_1px_rgba(204,255,0,0.22)]"
            )}
            style={{ transform: "translateZ(12px)" }}
          >
            <Image
              src={art.src}
              alt={`${art.label} Sherhood ownership card`}
              fill
              className="object-cover select-none"
              priority={size === "lg"}
              draggable={false}
              sizes="(max-width: 640px) 70vw, 240px"
            />

            {foil ? (
              <div
                className="pointer-events-none absolute inset-0 card-foil-sheen mix-blend-soft-light opacity-45"
                aria-hidden
              />
            ) : null}

            {!reduceMotion ? (
              <div
                className="pointer-events-none absolute inset-0 card-soft-shimmer mix-blend-soft-light"
                aria-hidden
              />
            ) : null}

            {enableTilt ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at ${tiltState.gx}% ${tiltState.gy}%, rgba(255,255,255,0.38) 0%, transparent 45%)`,
                  mixBlendMode: "soft-light",
                }}
              />
            ) : null}

            {(stockLabel || pctLabel || tokenId !== undefined) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-2.5 pb-2.5 pt-12">
                {stockLabel ? (
                  <p className="line-clamp-2 text-center text-[11px] font-bold leading-tight tracking-wide text-white">
                    {stockLabel}
                  </p>
                ) : null}
                {pctLabel ? (
                  <p
                    className="mt-0.5 text-center text-[11px] font-semibold tabular-nums tracking-wide"
                    style={{ color: art.accent }}
                  >
                    {pctLabel}%
                  </p>
                ) : null}
                {tokenId !== undefined ? (
                  <p className="mt-0.5 text-center font-mono text-[9px] tracking-wider text-zinc-500">
                    #{String(tokenId)} · {art.label}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
