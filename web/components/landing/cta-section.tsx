"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export function CtaSection() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-32 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-robinhood/20 bg-gradient-to-b from-robinhood/10 to-transparent p-16"
      >
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-robinhood/15 blur-[100px]" />

        <h2 className="relative text-4xl font-black tracking-tight text-zinc-100 sm:text-5xl">
          Ready to claim a slice?
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-lg text-zinc-500">
          Browse live pots, deposit USDG, and mint your mystery ownership card.
        </p>
        <div className="relative mt-10 flex items-center justify-center gap-4">
          <Link
            href="/app"
            className="group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-xl bg-robinhood px-8 text-base font-bold text-black shadow-xl shadow-robinhood/30 transition-all hover:shadow-2xl hover:shadow-robinhood/40"
          >
            <span className="relative z-10">Browse Pots</span>
            <span className="relative z-10 text-lg">→</span>
            <div className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
