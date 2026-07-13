"use client"

import { motion } from "framer-motion"

const features = [
  {
    title: "Ownership, Not Wipeouts",
    desc: "Every card is a claim on the pool. Chance sets claim size — never zeroes your deposit into nothing.",
  },
  {
    title: "Financial Collectibles",
    desc: "After reveal you hold a unique NFT tied to real underlying assets — tradeable, collectible, and valuable.",
  },
  {
    title: "Fair Allocation Math",
    desc: "VRF multipliers normalize so total ownership is always 100%. Expected value tracks your deposit share.",
  },
  {
    title: "Real Asset Pots",
    desc: "Pots acquire stocks, ETFs, crypto, or tokenized RWAs once funding closes — then cards become claims.",
  },
]

export function WhySection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-16 text-center"
      >
        <h2 className="text-4xl font-black tracking-tight text-zinc-100 sm:text-5xl">
          Why Sherwood
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-500">
          Investing + collecting + suspense — without casino wipeouts.
        </p>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 transition-colors hover:border-zinc-700"
          >
            <h3 className="text-xl font-bold text-zinc-200">{f.title}</h3>
            <p className="mt-2 leading-relaxed text-zinc-500">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
