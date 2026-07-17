"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { StockLogoStack } from "@/components/stocks/stock-logo"

const steps = [
  {
    num: "01",
    title: "Fund a basket",
    desc: "Join an open basket with ETH, WETH, or USDG. Your deposit mints a mystery card.",
    symbols: ["NVDA", "AAPL"],
  },
  {
    num: "02",
    title: "The basket buys stocks",
    desc: "When the goal is hit, the protocol picks 2–5 Robinhood stock tokens and buys them with the pool. Nobody knows the picks in advance.",
    symbols: ["MSFT", "GOOGL", "SPY"],
  },
  {
    num: "03",
    title: "Reveal your share",
    desc: "Each card gets a random share of the basket. Hold $SHRH for better reveal luck. No card ever goes to zero.",
    symbols: ["SHRH"],
  },
]

export function HowItWorksSection() {
  return (
    <section id="how" className="page-container py-16 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-16 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Three steps. Fund, wait for the buy, reveal your card.
        </p>
      </motion.div>

      <div className="grid gap-8 sm:gap-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <StockLogoStack symbols={s.symbols} size={32} max={3} className="mb-4 justify-center" />
            <p className="text-xs font-semibold tracking-[0.25em] text-sherhood">{s.num}</p>
            <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-white/35">
        Full walkthrough in the{" "}
        <Link href="/docs/getting-started" className="font-medium text-sherhood hover:underline">
          docs
        </Link>
        .
      </p>
    </section>
  )
}
