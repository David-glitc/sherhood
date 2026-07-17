"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const faqs = [
  {
    q: "What do I need to start?",
    a: "A wallet with ETH, WETH, or USDG on Robinhood Chain. Connect, pick an open basket, and deposit.",
  },
  {
    q: "What is a mystery card?",
    a: "An NFT you get when you deposit. It hides your share of the basket until reveal. At reveal, it shows the exact percentage you own.",
  },
  {
    q: "Who picks the stocks?",
    a: "The protocol does, when the basket fills. It picks 2 to 5 stock tokens from the pool. Nobody knows the picks before the buy.",
  },
  {
    q: "Can I lose everything?",
    a: "No card is revealed at zero. Your share can be smaller or bigger than your deposit, but every card gets a slice. Stock prices still move, so the value of the basket can go up or down.",
  },
  {
    q: "What is $SHRH?",
    a: "The Sherhood token. Holding it at reveal time boosts your luck. It launches on Orynth soon.",
  },
  {
    q: "Is this audited?",
    a: "No. Sherhood is experimental software. Use money you can afford to lose. Read the terms before you deposit.",
  },
]

export function FaqSection() {
  return (
    <section className="page-container-narrow py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Short answers. Longer ones live in the docs.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3">
        {faqs.map((f, i) => (
          <motion.details
            key={f.q}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="product-surface group px-5 py-4"
          >
            <summary className="touch-target flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden className="text-primary transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </motion.details>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-white/35">
        More in the{" "}
        <Link href="/docs/getting-started" className="font-medium text-sherhood hover:underline">
          docs
        </Link>{" "}
        and{" "}
        <Link href="/legal/terms" className="font-medium text-sherhood hover:underline">
          terms
        </Link>
        .
      </p>
    </section>
  )
}
