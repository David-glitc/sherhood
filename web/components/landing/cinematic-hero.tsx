"use client"

import { useMemo, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { SHRH_SYMBOL } from "@/lib/protocol"

type Floater = {
  symbol: string
  x: number
  y: number
  size: number
  depth: number
  drift: number
  delay: number
  opacity: number
}

function buildField(count: number): Floater[] {
  const stocks = BASKET_STOCKS
  const out: Floater[] = []
  for (let i = 0; i < count; i++) {
    const s = stocks[i % stocks.length]
    const depth = 0.15 + (i % 5) * 0.18
    out.push({
      symbol: s.symbol,
      x: ((i * 47) % 92) + 4,
      y: ((i * 31) % 88) + 6,
      size: 28 + (i % 6) * 10 + depth * 18,
      depth,
      drift: 8 + (i % 7) * 3,
      delay: (i % 9) * 0.35,
      opacity: 0.18 + depth * 0.45,
    })
  }
  return out
}

function StockFloater({
  item,
  mx,
  my,
  reduced,
  hideOnMobile,
}: {
  item: Floater
  mx: ReturnType<typeof useMotionValue<number>>
  my: ReturnType<typeof useMotionValue<number>>
  reduced: boolean
  hideOnMobile: boolean
}) {
  const px = useTransform(mx, (v) => v * item.depth * -28)
  const py = useTransform(my, (v) => v * item.depth * -20)

  return (
    <motion.div
      className={`pointer-events-none absolute will-change-transform ${
        hideOnMobile ? "hidden sm:block" : ""
      }`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        x: px,
        y: py,
        width: item.size,
        height: item.size,
        opacity: item.opacity,
      }}
      animate={
        reduced
          ? undefined
          : {
              y: [0, -item.drift, 0, item.drift * 0.6, 0],
              rotate: [0, 4, -3, 2, 0],
            }
      }
      transition={{
        duration: 10 + item.delay * 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay: item.delay,
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-full border border-white/15 shadow-[0_0_40px_rgba(204,255,0,0.08)]"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02))",
          backdropFilter: "blur(8px)",
        }}
      >
        <Image
          src={`/stocks/${item.symbol}.png`}
          alt=""
          fill
          sizes={`${item.size}px`}
          className="object-cover"
          unoptimized
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />
      </div>
    </motion.div>
  )
}

export function CinematicHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion() ?? false
  const field = useMemo(() => buildField(22), [])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springX = useSpring(mx, { stiffness: 60, damping: 18 })
  const springY = useSpring(my, { stiffness: 60, damping: 18 })

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const fieldScale = useTransform(scrollYProgress, [0, 1], [1, 1.18])
  const fieldOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.15])

  return (
    <section
      ref={sectionRef}
      onMouseMove={(e) => {
        if (reduced) return
        const rect = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - rect.left) / rect.width - 0.5)
        my.set((e.clientY - rect.top) / rect.height - 0.5)
      }}
      onMouseLeave={() => {
        mx.set(0)
        my.set(0)
      }}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black pb-8 pt-20"
    >
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(204,255,0,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.05),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_80%,rgba(204,255,0,0.06),transparent_35%)]" />
        <div className="glass-ray absolute left-1/2 top-[18%] h-[55vh] w-[70vw] -translate-x-1/2 opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      {/* Parallax stock field */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ scale: fieldScale, opacity: fieldOpacity }}
      >
        {field.map((item, i) => (
          <StockFloater
            key={`${item.symbol}-${item.x}-${item.y}`}
            item={item}
            mx={springX}
            my={springY}
            reduced={reduced}
            hideOnMobile={i % 2 === 1}
          />
        ))}
      </motion.div>

      {/* Glass content plate */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-5 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel relative w-full max-w-3xl overflow-hidden rounded-[24px] px-5 py-8 sm:rounded-[28px] sm:px-12 sm:py-14"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -left-10 top-1/3 h-40 w-40 rounded-full bg-[#ccff00]/15 blur-3xl"
          />

          <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-[#ccff00]">
            Sherhood · Phase two
          </p>

          <h1 className="mt-5 text-[clamp(2.4rem,7vw,5.2rem)] font-normal leading-[0.95] tracking-[-0.04em] text-[#e5e7eb]">
            Own the basket.
            <br />
            <span className="bg-gradient-to-b from-white to-white/45 bg-clip-text text-transparent">
              Reveal the share.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed tracking-[-0.3px] text-[#999999] sm:mt-6 sm:text-lg">
            Pool into a live stock basket on Robinhood Chain. When it fills,
            the protocol buys real stock tokens. Your card shows what you own.
          </p>

          <div className="mt-7 flex w-full flex-col items-center gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:justify-center">
            <Link
              href="/app"
              className="group relative inline-flex min-h-12 w-full max-w-[280px] items-center justify-center overflow-hidden rounded-full bg-[#ccff00] px-8 text-base font-semibold text-black shadow-[0_0_40px_rgba(204,255,0,0.35)] transition hover:brightness-110 sm:w-auto sm:min-w-[200px]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
              />
              Enter baskets
            </Link>
            <Link
              href="/#how"
              className="inline-flex min-h-12 w-full max-w-[280px] items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-medium text-[#e5e7eb] backdrop-blur-xl transition hover:border-[#ccff00]/35 hover:bg-white/[0.08] sm:w-auto sm:min-w-[160px]"
            >
              How it works
            </Link>
          </div>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ccff00] shadow-[0_0_8px_#ccff00]" />
            <span className="text-[12px] font-medium text-[#e5e7eb]">${SHRH_SYMBOL}</span>
            <span className="text-[12px] text-[#999999]">coming soon on Orynth</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-10 flex flex-col items-center gap-2 text-[#666666]"
        >
          <span className="text-[10px] uppercase tracking-[0.35em]">Scroll</span>
          <span className="block h-8 w-px bg-gradient-to-b from-[#ccff00]/80 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  )
}
