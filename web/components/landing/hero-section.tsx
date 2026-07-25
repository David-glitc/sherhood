"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { EthUsdTicker } from "@/components/layout/eth-usd-ticker"
import { ShrhLuckPill } from "@/components/layout/shrh-luck-pill"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { HeroAcreSvg } from "@/components/landing/hero-acre-svg"
import { SHRH_SYMBOL } from "@/lib/protocol"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-10">
      {/* Soft vignette — RH dark canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.07)_0%,transparent_55%)]"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 mb-10 flex flex-wrap items-center justify-center gap-3 text-sm"
      >
        <EthUsdTicker />
        <span className="text-[#333333]">|</span>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium tracking-wide text-[#999999]">
          <UsdgLogo size={14} showLabel />
        </span>
        <span className="text-[#333333]">|</span>
        <ShrhLuckPill />
      </motion.div>

      {/* Mobile: SVG on top, text under (col-reverse). Desktop: text left, SVG right. */}
      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl flex-col-reverse items-center justify-center gap-10 lg:flex-row lg:gap-16">
        <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ccff00]"
          >
            Sherhood · Robinhood Chain
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-[34px] font-normal leading-[1.1] tracking-[-0.6px] text-[#e5e7eb] sm:text-[48px] sm:leading-[1.05] lg:text-[58px] lg:leading-[1]"
          >
            Drop into a pool.
            <br />
            <span className="text-[#999999]">Reveal your share.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-md text-base font-normal leading-[24px] tracking-[-0.4px] text-[#999999]"
          >
            Put money into a shared Sherd pool. When it fills, the pool buys real
            Robinhood stock tokens. You get a mystery card. At reveal, the card
            shows your share.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center rounded-[14px] bg-[#ccff00] px-8 py-4 text-base font-semibold text-black transition hover:brightness-110"
            >
              Open Sherd pools
            </Link>
            <Link
              href="/#how"
              className="inline-flex min-h-11 items-center rounded-[14px] border border-[#333333] px-5 py-3 text-sm font-normal text-[#9e9e9e] transition hover:border-[#ccff00]/40 hover:text-[#e5e7eb]"
            >
              How it works
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42, duration: 0.5 }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#333333] bg-[#0f0f0f] px-4 py-2"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ccff00]" />
            <span className="text-[12px] font-medium text-[#e5e7eb]">
              ${SHRH_SYMBOL}
            </span>
            <span className="text-[12px] text-[#999999]">
              coming soon on Orynth
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[460px] shrink-0 lg:w-[46%]"
        >
          <HeroAcreSvg />
        </motion.div>
      </div>
    </section>
  )
}
