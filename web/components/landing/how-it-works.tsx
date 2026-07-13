"use client"

import { motion } from "framer-motion"

const steps = [
  {
    num: "01",
    title: "Join a Pot",
    desc: "Deposit USDG into an NVIDIA, BTC, or community basket. You mint a mystery ownership card.",
  },
  {
    num: "02",
    title: "Pot Fills & Buys",
    desc: "When the goal or deadline hits, the treasury swaps into the target asset. Cards stay sealed.",
  },
  {
    num: "03",
    title: "Reveal Your Claim",
    desc: "VRF assigns ownership weights that always sum to 100%. Rarity follows your allocation — never zero.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-20 text-center"
      >
        <h2 className="text-4xl font-black tracking-tight text-zinc-100 sm:text-5xl">
          How It Works
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-500">
          Deposit → mint → reveal → own a fractional claim.
        </p>
      </motion.div>

      <div className="relative grid gap-12 md:grid-cols-3">
        <div className="absolute left-1/2 top-16 hidden h-0.5 w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700 to-transparent md:block" />

        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2, duration: 0.5 }}
            className="relative text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-xl font-black text-robinhood shadow-lg shadow-robinhood/10">
              {s.num}
            </div>
            <h3 className="mb-3 text-xl font-bold text-zinc-200">{s.title}</h3>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-500">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
