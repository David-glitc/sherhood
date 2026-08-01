"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react"
import { SHERHOOD_TAGLINE } from "@/lib/protocol"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { StockLogo } from "@/components/stocks/stock-logo"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type Slide = {
  kicker: string
  title: string
  body: string
  points?: string[]
}

const SLIDES: Slide[] = [
  {
    kicker: "Sherhood",
    title: SHERHOOD_TAGLINE,
    body: "Stock ownership, packaged as cards, on Robinhood Chain.",
  },
  {
    kicker: "The problem",
    title: "On-chain stocks feel like spreadsheets.",
    body: "People want exposure — and something they can collect, trade, and show.",
  },
  {
    kicker: "The product",
    title: "Fund a pool. Mint a card. Reveal your share.",
    body: "When funding closes, luck picks 2–5 RH stock tokens. Your card becomes a claim on that vault.",
    points: ["Pay ETH, WETH, or USDG", "Sealed → revealed ownership %", "Claim, trade, or early-exit"],
  },
  {
    kicker: "The moat",
    title: "Every card is a unique collectible.",
    body: "Art and rarity from underlying assets, deposit size, and pool share — gacha-card energy, real stock NAV under the hood.",
  },
  {
    kicker: "Live now",
    title: "Sherd pools, cards, Trade, and Relay bridge.",
    body: "Bridge any Relay chain into Robinhood. Open Sherd pools are funding. Cards mint on every deposit.",
  },
  {
    kicker: "Next",
    title: "Instant Mint — solo vault, immediate reveal.",
    body: "Pay $1.50–$2. Deployer opens the pool. You bankroll it, stocks buy, Sherd reveals — no $5 create fee.",
  },
  {
    kicker: "Token",
    title: "$SHERD is the unit of account + luck layer.",
    body: "Quotes in $SHERD. Holders unlock reveal boosts and fee-free community creation.",
  },
  {
    kicker: "Why now",
    title: "Robinhood Chain + tokenized stocks.",
    body: "Native RH stock tokens, Uniswap liquidity, and a chain built for this exact product surface.",
  },
  {
    kicker: "Join",
    title: "Collect the market.",
    body: "Open a pool. Mint your first card. Bridge in if you’re coming from elsewhere.",
  },
]

const DECK_LOGOS = ["AAPL", "NVDA", "TSLA", "MSFT", "META", "AMZN", "GOOGL", "SPY"] as const

export function ProductDeck() {
  const reduceMotion = useReducedMotion() ?? false
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]

  const go = useCallback((next: number) => {
    setIndex(() => Math.max(0, Math.min(SLIDES.length - 1, next)))
  }, [])

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        next()
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev])

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/sherhood-banner.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.72)_45%,rgba(0,0,0,0.55)_100%)]" />
        {!reduceMotion && (
          <motion.div
            className="absolute -right-20 top-1/4 size-80 rounded-full bg-[#ccff00]/10 blur-3xl"
            animate={{ opacity: [0.3, 0.55, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Floating stock logos */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[18%] hidden justify-center gap-3 opacity-70 sm:flex md:gap-4"
      >
        {DECK_LOGOS.filter((s) => BASKET_STOCKS.some((b) => b.symbol === s)).map((sym, i) => (
          <motion.div
            key={sym}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.45 }}
            className="rounded-full border border-white/10 bg-black/50 p-1.5 backdrop-blur-sm"
          >
            <StockLogo symbol={sym} size={28} />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-3 py-2 text-sm text-white/80 backdrop-blur-md transition hover:border-[#ccff00]/40 hover:text-[#ccff00]"
        >
          <ChevronLeft className="size-4" />
          Back
        </Link>
        <p className="font-mono text-[11px] text-white/50">
          {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </p>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-10 lg:px-16">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#ccff00]">
          {slide.kicker.toUpperCase()}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -14 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl py-6 sm:py-10"
          >
            <h1 className="text-[clamp(1.65rem,5.5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:mt-5 sm:text-lg sm:leading-8">
              {slide.body}
            </p>
            {slide.points && (
              <ul className="mt-5 space-y-2 sm:mt-6">
                {slide.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-white/85">
                    <span className="size-1.5 rounded-full bg-[#ccff00]" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {index === SLIDES.length - 1 && (
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/app" className={cn(buttonVariants({ size: "lg" }), "min-w-32")}>
                  Open Sherd pools
                </Link>
                <Link
                  href="/bridge"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-32")}
                >
                  Bridge in
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-8 bg-[#ccff00]" : "w-2 bg-white/25 hover:bg-white/50"
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className="touch-target inline-flex items-center justify-center rounded-xl border border-white/15 bg-black/40 px-3 text-white disabled:opacity-30"
              aria-label="Previous slide"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={index === SLIDES.length - 1}
              className="touch-target inline-flex items-center justify-center rounded-xl border border-[#ccff00]/40 bg-[#ccff00]/15 px-3 text-[#ccff00] disabled:opacity-30"
              aria-label="Next slide"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
