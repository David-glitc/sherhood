import Link from "next/link"
import { ArrowDownRight, ArrowRight } from "lucide-react"
import { HeroPrism } from "@/components/landing/hero-prism"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const facts = [
  { value: "$1.5–2", label: "Instant Mint" },
  { value: "2–5", label: "stocks / vault" },
  { value: "25", label: "registry tokens" },
]

/**
 * Landing hero — server-rendered copy + client prism.
 * Avoids framer entrance animations on the LCP path.
 * OpenSea lives in its own section below — not in the hero.
 */
export function CinematicHero() {
  return (
    <section className="relative isolate min-h-[min(100svh,56rem)] overflow-hidden border-b border-border bg-black pb-12 pt-24 sm:pb-16 sm:pt-28 lg:flex lg:min-h-[100svh] lg:items-center lg:pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
        <div className="absolute left-[8%] top-[18%] size-72 rounded-full bg-[#ccff00]/[0.05] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
        <div className="hero-grid absolute inset-0 opacity-30" />
      </div>

      <div className="page-container-wide relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(26rem,1.05fr)] lg:gap-8 xl:gap-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ccff00]">
            Robinhood Chain
            <span className="mx-2 inline-block h-px w-6 translate-y-[-3px] bg-[#ccff00]/50 align-middle" />
            <span className="text-[#c4b59a]">Live pools</span>
          </p>

          <h1 className="mt-6 max-w-3xl text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
            Own the pool.
            <span className="mt-1 block text-[#ccff00]">Reveal your share.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-[#a3a3a3] sm:text-lg sm:leading-8">
            Fund a Sherd vault. Get a sealed card. When it seals, your card reveals real RH stock
            tokens and your ownership share — or Instant Mint a solo vault for $1.50–$2.
          </p>

          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <Link
              href="/create?tab=instant"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-12 min-w-44 justify-between gap-5 bg-[#ccff00] px-5 text-black hover:bg-[#ccff00]/90"
              )}
            >
              Instant Mint
              <ArrowRight
                data-icon="inline-end"
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/app"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 min-w-40 border-white/25 bg-transparent text-white hover:bg-white/5"
              )}
            >
              Explore pools
              <ArrowDownRight data-icon="inline-end" />
            </Link>
          </div>

          <div className="mt-10 flex max-w-xl flex-wrap gap-x-10 gap-y-4">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-20">
                <p className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">
                  {fact.value}
                </p>
                <p className="mt-1 text-xs text-[#888]">{fact.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <HeroPrism />
        </div>
      </div>
    </section>
  )
}
