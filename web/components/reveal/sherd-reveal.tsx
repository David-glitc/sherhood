"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, Share2, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { FoilTearGl } from "@/components/reveal/foil-tear-gl"
import { Button } from "@/components/ui/button"
import { CARD_ART, cardArtForRarity, rarityKeyFromIndex } from "@/lib/card-art"
import { absoluteUrl } from "@/lib/seo"
import { playRevealSound } from "@/lib/sfx"
import { cn } from "@/lib/utils"

export type SherdRevealPayload = {
  tokenId: string
  rarityIndex: number
  ownershipPct?: string
  potName?: string
  holdings?: string[]
  depositFmt?: string
}

type Phase = "ready" | "tearing" | "burst" | "done"

const SEEN_PREFIX = "sherhood.reveal.seen."

export function markRevealSeen(tokenId: string) {
  try {
    sessionStorage.setItem(`${SEEN_PREFIX}${tokenId}`, "1")
  } catch {
    /* ignore */
  }
}

export function hasRevealBeenSeen(tokenId: string): boolean {
  try {
    return sessionStorage.getItem(`${SEEN_PREFIX}${tokenId}`) === "1"
  } catch {
    return false
  }
}

type SherdRevealProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sherd: SherdRevealPayload
  /** Auto-start tear after open (default true). */
  autoPlay?: boolean
  /** Owner gets full rip + share; viewers get preview label. */
  mode?: "owner" | "viewer"
}

/** Pack-rip ritual: sealed foil → WebGL tear → rarity burst → share. */
export function SherdReveal({
  open,
  onOpenChange,
  sherd,
  autoPlay = true,
  mode = "owner",
}: SherdRevealProps) {
  const [phase, setPhase] = useState<Phase>("ready")
  const [progress, setProgress] = useState(0)
  const [webglOk, setWebglOk] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const tearingRef = useRef(false)
  const dragActiveRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragProgressRef = useRef(0)
  const soundStartedRef = useRef(false)
  const foilSurfaceRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  const art = cardArtForRarity(sherd.rarityIndex, true)
  const sealed = CARD_ART.unrevealed
  const tierKey = rarityKeyFromIndex(sherd.rarityIndex)
  const tier =
    tierKey === "unrevealed"
      ? "common"
      : (tierKey as "common" | "rare" | "epic" | "legendary")

  const finishTear = useCallback(() => {
    setProgress(1)
    setPhase("burst")
    window.setTimeout(() => {
      setPhase("done")
      tearingRef.current = false
      dragActiveRef.current = false
      soundStartedRef.current = false
    }, 700)
  }, [])

  const animateTearFrom = useCallback(
    (from: number) => {
      if (tearingRef.current && from <= 0.05) return
      tearingRef.current = true
      setPhase("tearing")
      if (!soundStartedRef.current) {
        playRevealSound(tier)
        soundStartedRef.current = true
      }
      const start = performance.now()
      const startProgress = Math.min(0.95, Math.max(0, from))
      const duration = Math.max(280, 1100 * (1 - startProgress))
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const next = startProgress + (1 - startProgress) * eased
        setProgress(next)
        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          finishTear()
        }
      }
      requestAnimationFrame(tick)
    },
    [tier, finishTear]
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener("change", onChange)
    try {
      const c = document.createElement("canvas")
      setWebglOk(Boolean(c.getContext("webgl2")))
    } catch {
      setWebglOk(false)
    }
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const startTear = useCallback(() => {
    if (phase === "done" || phase === "burst") return
    animateTearFrom(progress > 0.05 ? progress : 0)
  }, [animateTearFrom, phase, progress])

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (reduceMotion || phase === "done" || phase === "burst") return
      e.preventDefault()
      const target = foilSurfaceRef.current
      if (target) {
        try {
          target.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      dragActiveRef.current = true
      dragStartYRef.current = e.clientY
      dragProgressRef.current = progressRef.current
      setPhase("tearing")
      if (!soundStartedRef.current && progressRef.current < 0.15) {
        playRevealSound(tier)
        soundStartedRef.current = true
      }
    },
    [reduceMotion, phase, tier]
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragActiveRef.current || reduceMotion) return
      e.preventDefault()
      const delta = dragStartYRef.current - e.clientY
      const span = typeof window !== "undefined" && window.innerWidth < 640 ? 100 : 140
      const next = Math.min(1, Math.max(0, dragProgressRef.current + delta / span))
      setProgress(next)
      if (next >= 0.92) {
        dragActiveRef.current = false
        tearingRef.current = true
        finishTear()
      }
    },
    [reduceMotion, finishTear]
  )

  const onPointerUp = useCallback(() => {
    if (!dragActiveRef.current) return
    dragActiveRef.current = false
    const p = progressRef.current
    if (p >= 0.5) {
      animateTearFrom(p)
    } else if (p < 0.1) {
      setProgress(0)
      setPhase("ready")
      tearingRef.current = false
      soundStartedRef.current = false
    } else {
      animateTearFrom(p)
    }
  }, [animateTearFrom])

  // Non-passive listeners — React's onPointer* can't preventDefault on mobile scroll.
  useEffect(() => {
    const el = foilSurfaceRef.current
    if (!el || !open) return
    const down = (e: PointerEvent) => onPointerDown(e)
    const move = (e: PointerEvent) => onPointerMove(e)
    const up = () => onPointerUp()
    el.addEventListener("pointerdown", down, { passive: false })
    el.addEventListener("pointermove", move, { passive: false })
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", down)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
    }
  }, [open, onPointerDown, onPointerMove, onPointerUp])

  // Lock body scroll while reveal is open (mobile Safari)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setPhase("ready")
      setProgress(0)
      tearingRef.current = false
      dragActiveRef.current = false
      soundStartedRef.current = false
      return
    }
    markRevealSeen(sherd.tokenId)
    if (reduceMotion) {
      setProgress(1)
      setPhase("done")
      return
    }
    // Don't auto-play when owner can drag — wait briefly then hint only
    if (!autoPlay) return
    // Auto-play for viewers; owners get drag-first with delayed soft auto if idle
    if (mode === "viewer") {
      const id = window.setTimeout(() => animateTearFrom(0), 480)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => {
      // Only auto if still ready (user hasn't started dragging)
      if (!tearingRef.current && dragProgressRef.current === 0) {
        /* keep ready — owner should drag; button still available */
      }
    }, 800)
    return () => window.clearTimeout(id)
  }, [open, sherd.tokenId, autoPlay, reduceMotion, mode, animateTearFrom])

  const shareUrl = absoluteUrl(`/sherds/${sherd.tokenId}`)

  const onShare = useCallback(async () => {
    const title = `Sherd #${sherd.tokenId} · ${art.label}`
    const text = [
      art.label,
      sherd.ownershipPct ? `${sherd.ownershipPct}% ownership` : null,
      sherd.potName ? sherd.potName : null,
      "on Sherhood",
    ]
      .filter(Boolean)
      .join(" · ")
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: shareUrl })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Reveal link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }, [art.label, sherd, shareUrl])

  const onDownload = useCallback(async () => {
    try {
      const res = await fetch(art.src)
      if (!res.ok) throw new Error("fetch")
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = `sherhood-sherd-${sherd.tokenId}-${art.label.toLowerCase()}.webp`
      a.click()
      URL.revokeObjectURL(href)
      toast.success("Card image downloaded")
    } catch {
      toast.error("Could not download")
    }
  }, [art, sherd.tokenId])

  const holdingsLine = useMemo(() => {
    if (!sherd.holdings?.length) return null
    return `${sherd.holdings.length} vault asset${sherd.holdings.length === 1 ? "" : "s"}`
  }, [sherd.holdings])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal
      aria-labelledby="sherd-reveal-title"
    >
      <button
        type="button"
        aria-label="Close reveal"
        className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 transition hover:text-white"
        onClick={() => onOpenChange(false)}
      >
        <X className="size-4" />
      </button>

      <div className="relative flex w-full max-w-md flex-col items-center">
        <p
          id="sherd-reveal-title"
          className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: phase === "done" || phase === "burst" ? art.accent : "#ccff00" }}
        >
          {mode === "viewer"
            ? phase === "ready"
              ? "Preview reveal"
              : phase === "tearing"
                ? "Opening…"
                : `${art.label} · preview`
            : phase === "ready"
              ? "Rip your Sherd"
              : phase === "tearing"
                ? "Opening…"
                : art.label}
        </p>

        <div
          className="relative w-[min(72vw,280px)]"
          style={{
            aspectRatio: "2 / 3",
            filter:
              phase === "burst" || phase === "done"
                ? `drop-shadow(0 0 28px ${art.glow})`
                : "drop-shadow(0 0 18px rgba(204,255,0,0.25))",
          }}
        >
          {(phase === "burst" || phase === "done") && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[160%] -translate-x-1/2 -translate-y-1/2",
                !reduceMotion && "sherd-rays-spin"
              )}
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg, ${art.accent}33 20deg, transparent 40deg, ${art.accent}22 60deg, transparent 80deg, ${art.accent}33 100deg, transparent 120deg)`,
              }}
            />
          )}

          <div
            ref={foilSurfaceRef}
            className={cn(
              "relative size-full overflow-hidden rounded-2xl border border-white/15 bg-[#050806]",
              (phase === "ready" || phase === "tearing") &&
                !reduceMotion &&
                "cursor-grab touch-none select-none active:cursor-grabbing"
            )}
            style={{ touchAction: "none" }}
          >
            <FoilTearGl
              sealedSrc={sealed.src}
              revealedSrc={art.src}
              progress={progress}
              accent={art.accent}
              fallback={!webglOk || reduceMotion}
              className="pointer-events-none absolute inset-0 size-full"
            />
            {(phase === "ready" || (phase === "tearing" && progress < 0.35)) &&
            !reduceMotion ? (
              <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Swipe up or tap below
              </p>
            ) : null}
          </div>
        </div>

        {phase === "ready" ? (
          <Button
            type="button"
            size="lg"
            className="mt-6 min-h-12 w-full max-w-xs gap-2 bg-[#ccff00] font-semibold text-black hover:opacity-90"
            onClick={startTear}
          >
            <Sparkles className="size-4" />
            {mode === "viewer" ? "Watch opening" : "Tap to rip"}
          </Button>
        ) : null}

        {phase === "done" ? (
          <div className="mt-5 w-full max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
              <p className="text-lg font-bold tabular-nums text-white">
                Sherd #{sherd.tokenId}
              </p>
              {sherd.ownershipPct ? (
                <p className="mt-1 text-sm tabular-nums" style={{ color: art.accent }}>
                  {sherd.ownershipPct}% ownership
                </p>
              ) : null}
              {sherd.potName ? (
                <p className="mt-1 text-xs text-white/45">{sherd.potName}</p>
              ) : null}
              {holdingsLine ? (
                <p className="mt-1 text-[11px] text-white/40">{holdingsLine}</p>
              ) : null}
              {sherd.depositFmt ? (
                <p className="mt-1 text-[11px] tabular-nums text-white/35">
                  Deposit ${sherd.depositFmt}
                </p>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {mode === "owner" ? (
                <>
                  <Button type="button" variant="outline" className="gap-2" onClick={onShare}>
                    <Share2 className="size-3.5" />
                    Share
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={onDownload}>
                    <Download className="size-3.5" />
                    Download
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="col-span-2 gap-2"
                  onClick={onShare}
                >
                  <Share2 className="size-3.5" />
                  Copy Sherd link
                </Button>
              )}
            </div>
            <Button
              type="button"
              className="mt-2 min-h-11 w-full bg-[#ccff00] font-semibold text-black hover:opacity-90"
              onClick={() => onOpenChange(false)}
            >
              Continue
            </Button>
            <button
              type="button"
              className="mt-2 w-full text-center text-xs text-white/40 transition hover:text-white/70"
              onClick={() => {
                tearingRef.current = false
                dragActiveRef.current = false
                soundStartedRef.current = false
                setPhase("ready")
                setProgress(0)
              }}
            >
              Replay
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

type RevealTriggerProps = {
  sherd: SherdRevealPayload
  className?: string
  label?: string
  /** Auto-open once per session when mounted and not yet seen. */
  autoOpenOnce?: boolean
  mode?: "owner" | "viewer"
  size?: "sm" | "lg" | "default"
}

/** Button + optional auto-open wrapper for pack-rip. */
export function SherdRevealTrigger({
  sherd,
  className,
  label,
  autoOpenOnce = false,
  mode = "owner",
  size = "sm",
}: RevealTriggerProps) {
  const [open, setOpen] = useState(false)
  const resolvedLabel =
    label ?? (mode === "owner" ? "Rip pack" : "Watch reveal")

  useEffect(() => {
    if (!autoOpenOnce || mode !== "owner") return
    if (hasRevealBeenSeen(sherd.tokenId)) return
    const id = window.setTimeout(() => setOpen(true), 600)
    return () => window.clearTimeout(id)
  }, [autoOpenOnce, sherd.tokenId, mode])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size === "lg" ? "lg" : size === "default" ? "default" : "sm"}
        className={cn(
          "gap-1.5",
          size === "lg" && "min-h-12 px-6 text-base",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Sparkles className={cn("size-3.5", size === "lg" && "size-4")} />
        {resolvedLabel}
      </Button>
      <SherdReveal open={open} onOpenChange={setOpen} sherd={sherd} mode={mode} />
    </>
  )
}
