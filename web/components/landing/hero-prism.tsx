"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { StockLogo } from "@/components/stocks/stock-logo"

const orbitingStocks = [
  { symbol: "NVDA", position: "left-[2%] top-[18%]", delay: 0 },
  { symbol: "AAPL", position: "right-[4%] top-[8%]", delay: 0.6 },
  { symbol: "TSLA", position: "right-[1%] bottom-[15%]", delay: 1.2 },
  { symbol: "MSFT", position: "left-[4%] bottom-[8%]", delay: 1.8 },
]

export function HeroPrism() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]" aria-label="Sherhood mystery ownership card">
      <div aria-hidden className="absolute inset-[8%] rounded-full border border-primary/15" />
      <div aria-hidden className="absolute inset-[18%] rounded-full border border-dashed border-primary/20" />
      <div
        aria-hidden
        className="absolute inset-[23%] rounded-full bg-primary/10 blur-[64px]"
      />

      {orbitingStocks.map((stock) => (
        <motion.div
          key={stock.symbol}
          className={`absolute z-20 ${stock.position}`}
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -10, 0], rotate: [0, 3, 0, -2, 0] }
          }
          transition={{
            duration: 5.5,
            delay: stock.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="rounded-full border border-border bg-background/90 p-1.5 shadow-2xl shadow-black">
            <StockLogo symbol={stock.symbol} size={40} />
          </div>
        </motion.div>
      ))}

      <motion.div
        className="absolute inset-[12%] z-10"
        initial={reduceMotion ? false : { opacity: 0, y: 24, rotateY: -12 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: 1200 }}
      >
        <motion.div
          className="relative h-full w-full"
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -10, 0], rotateZ: [-1.5, 0.8, -1.5] }
          }
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            aria-hidden
            className="absolute inset-[6%] translate-x-5 translate-y-5 rotate-3 rounded-[1.75rem] border border-primary/20 bg-primary/[0.03]"
          />
          <div
            aria-hidden
            className="absolute inset-[3%] -translate-x-3 translate-y-2 -rotate-2 rounded-[1.75rem] border border-white/10 bg-white/[0.02]"
          />

          <div className="absolute inset-[8%] overflow-hidden rounded-[1.75rem] border border-primary/55 bg-card shadow-[0_40px_120px_rgba(0,0,0,0.75)]">
            <Image
              src="/cards/mystery.webp"
              alt="Sherhood sealed ownership card"
              fill
              priority
              sizes="(max-width: 768px) 72vw, 430px"
              className="object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(115deg,transparent_18%,rgba(204,255,0,0.16)_44%,transparent_66%)] bg-[length:220%_100%] card-foil-sheen" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-5 pb-5 pt-20">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Sealed basket
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-xl font-semibold text-foreground sm:text-2xl">Your share waits inside.</p>
                <span className="shrink-0 rounded-lg border border-white/15 bg-black/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                  #4663
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
