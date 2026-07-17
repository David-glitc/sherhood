"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { StockLogo } from "@/components/stocks/stock-logo"

export function StocksMarqueeSection() {
  const doubled = [...BASKET_STOCKS, ...BASKET_STOCKS]

  return (
    <section className="border-y border-border py-16 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="page-container-wide mb-10 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,28rem)] sm:items-end"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Supported stocks</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Twenty-five tokens. Several in every basket.</h2>
        </div>
        <p className="text-sm leading-6 text-muted-foreground sm:justify-self-end">
          Each closed basket buys 2 to 5 supported Robinhood Chain stock tokens.
        </p>
      </motion.div>

      <div className="relative overflow-hidden bg-card py-5">
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

      <p className="page-container-wide mt-6 text-sm text-muted-foreground">
        See them all in the{" "}
        <Link href="/app" className="font-medium text-primary hover:underline">
          basket app
        </Link>
        .
      </p>
    </section>
  )
}
