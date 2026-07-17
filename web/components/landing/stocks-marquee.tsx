"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { StockLogo } from "@/components/stocks/stock-logo"

export function StocksMarqueeSection() {
  const doubled = [...BASKET_STOCKS, ...BASKET_STOCKS]

  return (
    <section className="py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-10 px-4 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The stock pool</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          25 Robinhood stock tokens are in the pool. The protocol picks 2–5 of
          them for each basket.
        </p>
      </motion.div>

      <div className="relative overflow-hidden border-y border-border bg-card py-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#050505] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#050505] to-transparent" />
        <div className="flex w-max animate-activity-scroll items-center gap-8 px-4">
          {doubled.map((s, i) => (
            <div
              key={`${s.symbol}-${i}`}
              aria-hidden={i >= BASKET_STOCKS.length ? true : undefined}
              className={`flex items-center gap-2.5 ${i >= BASKET_STOCKS.length ? "motion-duplicate" : ""}`}
            >
              <StockLogo symbol={s.symbol} size={30} />
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-foreground">{s.symbol}</p>
                <p className="text-xs text-muted-foreground">{s.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-white/35">
        See them all in the{" "}
        <Link href="/app" className="font-medium text-sherhood hover:underline">
          app
        </Link>
        .
      </p>
    </section>
  )
}
