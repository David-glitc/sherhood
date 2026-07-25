"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CtaSection() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <section className="page-container-wide pb-20 pt-8 sm:pb-28 sm:pt-12">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-primary/35 bg-primary p-6 text-primary-foreground sm:p-10 lg:p-14"
      >
        <div aria-hidden className="hero-grid absolute inset-0 opacity-20" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Your first card starts with one pool.</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Choose the pool. Set the amount. See what your card reveals.
            </h2>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row lg:flex-col">
            <Link
              href="/app"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-12 min-w-44 justify-between bg-background px-5 text-foreground hover:bg-background/90"
              )}
            >
              Explore pools
              <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs/getting-started"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 border-black/25 bg-transparent text-black hover:bg-black/10 hover:text-black"
              )}
            >
              Read the user guide
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
