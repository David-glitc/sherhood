"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowDownRight, ArrowRight } from "lucide-react"
import { HeroPrism } from "@/components/landing/hero-prism"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SHRH_SYMBOL } from "@/lib/protocol"

const facts = [
  { value: "25", label: "stock tokens" },
  { value: "2–5", label: "per basket" },
  { value: "3", label: "ways to fund" },
]

export function CinematicHero() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-border bg-background pb-12 pt-24 sm:pb-16 sm:pt-28 lg:flex lg:items-center lg:pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />
        <div className="absolute left-[8%] top-[18%] size-72 rounded-full bg-primary/[0.05] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-card/50 to-transparent" />
        <div className="hero-grid absolute inset-0 opacity-30" />
      </div>

      <div className="page-container-wide relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(26rem,1.08fr)] lg:gap-8 xl:gap-16">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span>Robinhood Chain</span>
            <span aria-hidden className="h-px w-8 bg-primary/50" />
            <span>Live baskets</span>
          </div>

          <h1 className="mt-6 max-w-3xl text-[clamp(3rem,8vw,6.75rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-foreground">
            Own the basket.
            <span className="mt-2 block text-primary">Reveal your share.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Fund one basket. Receive one sealed card. When the basket closes, your card reveals the stock tokens and the share you own.
          </p>

          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <Link
              href="/app"
              className={cn(buttonVariants({ size: "lg" }), "group h-12 min-w-44 justify-between gap-5 px-5")}
            >
              Explore baskets
              <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/#how"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 min-w-40")}
            >
              See the flow
              <ArrowDownRight data-icon="inline-end" />
            </Link>
          </div>

          <div className="mt-9 flex max-w-xl flex-wrap gap-x-8 gap-y-4 border-t border-border pt-5">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-20">
                <p className="text-xl font-semibold tabular-nums text-foreground">{fact.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{fact.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            ${SHRH_SYMBOL} is coming soon on Orynth.
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-xl lg:max-w-none"
        >
          <HeroPrism />
        </motion.div>
      </div>

      <p className="page-container-wide relative z-10 mt-8 text-xs uppercase tracking-[0.18em] text-muted-foreground lg:absolute lg:bottom-7 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2">
        Experimental software. Review the risks before funding.
      </p>
    </section>
  )
}
