"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export function CtaSection() {
  return (
    <section className="px-4 pb-16 pt-6 sm:pb-24 sm:pt-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-panel relative mx-auto flex max-w-2xl flex-col items-center overflow-hidden rounded-[28px] px-5 py-10 text-center sm:px-8 sm:py-12"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />
        <h2 className="text-[30px] font-normal tracking-[-0.6px] text-[#e5e7eb] sm:text-[36px]">
          Ready when you are
        </h2>
        <p className="mt-3 text-base leading-[22px] tracking-[-0.4px] text-[#999999]">
          Connect a wallet. Fund a basket. Mint your card.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center rounded-full bg-[#ccff00] px-8 py-4 text-base font-semibold text-black shadow-[0_0_36px_rgba(204,255,0,0.3)] transition hover:brightness-110"
          >
            Enter baskets
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-normal text-[#9e9e9e] backdrop-blur-xl transition hover:border-[#ccff00]/40 hover:text-[#e5e7eb]"
          >
            Read the docs
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
