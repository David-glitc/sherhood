"use client"

import { motion, useReducedMotion } from "framer-motion"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { StockLogoStack } from "@/components/stocks/stock-logo"

const ownershipRows = [
  { symbol: "NVDA", amount: "0.0328" },
  { symbol: "AAPL", amount: "0.1184" },
  { symbol: "MSFT", amount: "0.0712" },
]

export function ValuePropsSection() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <section className="border-y border-border bg-card/45">
      <div className="page-container-wide py-20 sm:py-28">
        <div className="mb-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">After reveal</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              A card you can read,
              <span className="block text-muted-foreground">price, claim, or trade.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-muted-foreground lg:justify-self-end">
            The sealed card becomes a clear ownership record. It shows the basket, your percentage, its rarity, and the stock tokens behind it.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            className="product-surface relative min-h-[32rem] overflow-hidden p-6 sm:p-8"
          >
            <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
            <div className="relative mx-auto max-w-[16rem] sm:max-w-[18rem]">
              <PotNftCard
                rarityIndex={3}
                revealed
                tokenId="4663"
                stockLabel="Technology basket"
                ownershipPct="6.42%"
                size="lg"
                interactive={false}
              />
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            <motion.article
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              className="product-surface p-6 sm:p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Known ownership</p>
              <p className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-foreground">6.42%</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Revealed cards show the exact percentage used when you claim the basket’s holdings.
              </p>
            </motion.article>

            <motion.article
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.08 }}
              className="product-surface p-6 sm:p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Several stocks</p>
              <StockLogoStack symbols={ownershipRows.map((row) => row.symbol)} size={40} max={3} className="mt-5" />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                One claim sends your share of every token held by the basket.
              </p>
            </motion.article>

            <motion.article
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.12 }}
              className="product-surface p-6 sm:col-span-2 sm:p-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Claim preview</p>
                  <h3 className="mt-3 text-2xl font-semibold text-foreground">See the tokens before you claim.</h3>
                </div>
                <span className="rounded-lg border border-primary/30 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary">
                  Epic
                </span>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                {ownershipRows.map((row) => (
                  <div key={row.symbol} className="rounded-xl border border-border bg-background p-4">
                    <dt className="text-xs text-muted-foreground">{row.symbol}</dt>
                    <dd className="mt-2 font-mono text-sm text-foreground">{row.amount}</dd>
                  </div>
                ))}
              </dl>
            </motion.article>
          </div>
        </div>
      </div>
    </section>
  )
}
