"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,255,107,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(34,80,40,0.35),_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(124,255,107,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,255,107,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />

      <motion.div
        className="pointer-events-none absolute left-1/4 top-24 h-72 w-72 rounded-full bg-sherhood/20 blur-[100px]"
        animate={{ y: [0, -30, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-28 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-sm font-semibold uppercase tracking-[0.45em] text-sherhood"
        >
          Sherhood
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-5 max-w-4xl font-heading text-5xl font-extrabold leading-[1.05] tracking-tight text-zinc-50 sm:text-7xl"
        >
          Own a slice of the pot.
          <span className="mt-2 block text-sherhood">Reveal decides how much.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-6 max-w-xl text-lg text-zinc-400"
        >
          Fractional Asset Loot on Robinhood Chain. Pay with ETH, WETH, or USDG. Everyone keeps a
          claim — never wiped to zero.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/app"
            className="inline-flex h-13 items-center rounded-2xl bg-sherhood px-8 text-base font-bold text-black transition hover:opacity-90"
          >
            Browse pots →
          </Link>
          <Link
            href="/docs/allocation"
            className="inline-flex h-13 items-center rounded-2xl border border-white/15 bg-white/5 px-8 text-base font-semibold text-zinc-200 backdrop-blur hover:border-white/30"
          >
            How allocation works
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
