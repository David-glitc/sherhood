"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { StockLogoStack } from "@/components/stocks/stock-logo"

const steps = [
  {
    number: "01",
    label: "Fund",
    title: "Choose a live basket.",
    copy: "Pay with USDG, ETH, or WETH. Your deposit mints a sealed card immediately.",
    symbols: ["AAPL", "NVDA"],
  },
  {
    number: "02",
    label: "Close",
    title: "The basket buys its stocks.",
    copy: "When funding closes, the basket buys 2 to 5 stock tokens from the live pool.",
    symbols: ["MSFT", "GOOGL", "SPY"],
  },
  {
    number: "03",
    label: "Reveal",
    title: "See exactly what you own.",
    copy: "Your card reveals its rarity and ownership percentage. Claim the stock tokens or list the card.",
    symbols: ["TSLA", "AMZN", "META"],
  },
]

export function HowItWorksSection() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <section id="how" className="page-container-wide py-20 sm:py-28 lg:py-36">
      <div className="grid gap-12 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The flow</p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl">
            One deposit.
            <span className="block text-muted-foreground">A basket of stocks.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            You don’t pick individual tickers or calculate allocations. Choose the basket and the amount. Your card carries the ownership claim.
          </p>
          <Link
            href="/docs/getting-started"
            className="touch-target mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Read the user guide
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </div>

        <ol className="border-t border-border">
          {steps.map((step, index) => (
            <motion.li
              key={step.number}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="grid gap-5 border-b border-border py-8 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:py-10"
            >
              <div>
                <p className="font-mono text-xs text-primary">{step.number}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{step.label}</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground sm:text-2xl">{step.title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{step.copy}</p>
              </div>
              <StockLogoStack symbols={step.symbols} size={34} max={3} className="sm:justify-end" />
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
