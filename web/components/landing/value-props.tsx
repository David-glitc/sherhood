"use client"

import { motion } from "framer-motion"

const props = [
  {
    title: "Real stock tokens",
    desc: "Baskets buy Robinhood stock tokens on chain. NVDA, AAPL, TSLA and 17 more.",
  },
  {
    title: "On-chain and open",
    desc: "Every deposit, buy, and reveal is a transaction on Robinhood Chain. Check any of it in the explorer.",
  },
  {
    title: "Luck picks the split",
    desc: "The protocol picks the stocks and the shares. Nobody can front-run the reveal. No card goes to zero.",
  },
  {
    title: "Your card, your asset",
    desc: "Cards are NFTs in your wallet. Trade them, hold them, or reveal them when the basket closes.",
  },
]

export function ValuePropsSection() {
  return (
    <section className="page-container-wide py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why Sherhood</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          A simple way to hold a piece of a stock basket.
        </p>
      </motion.div>

      <div className="responsive-grid">
        {props.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="product-surface p-6"
          >
            <div className="mb-4 h-1.5 w-8 rounded-full bg-primary" />
            <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
