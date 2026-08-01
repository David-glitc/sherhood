"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Layers, LayoutGrid, UserRound, Sparkles, Zap } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { readOnboardingState, writeOnboardingState } from "@/lib/onboarding"
import { SHERHOOD_TAGLINE, SHRH_SYMBOL } from "@/lib/protocol"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Welcome to Sherhood",
    body: `${SHERHOOD_TAGLINE}. Mint a Sherd in a pool, then claim your share when it reveals.`,
  },
  {
    id: "instant",
    icon: Zap,
    title: "Instant Mint",
    body: `Solo $1.50–$2 vault — deployer opens it, you fund, stocks buy, Sherd reveals. No $5 create fee.`,
    href: "/create?tab=instant",
    cta: "Mint Instant Sherd",
  },
  {
    id: "pools",
    icon: Layers,
    title: "Sherd pools",
    body: `Open pools buy 2–5 Robinhood Chain stocks when they end. Quotes in $${SHRH_SYMBOL}; settle with USDG, ETH, or $${SHRH_SYMBOL}.`,
    href: "/app",
    cta: "Browse pools",
  },
  {
    id: "sherds",
    icon: LayoutGrid,
    title: "Your Sherds",
    body: "Each deposit mints an ownership card. Trade sealed or revealed Sherds anytime.",
    href: "/inventory",
    cta: "View inventory",
  },
  {
    id: "profile",
    icon: UserRound,
    title: "Claim your name",
    body: "Choose a display name so others can find you on People and the leaderboard.",
    href: "/profile",
    cta: "Set profile",
  },
] as const

type AppWalkthroughProps = {
  onFinished?: () => void
}

/** Soft coach strip — non-modal so pools stay usable underneath. */
export function AppWalkthrough({ onFinished }: AppWalkthroughProps) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (readOnboardingState() === "pending") setOpen(true)
  }, [])

  const finish = (state: "done" | "skipped") => {
    writeOnboardingState(state)
    setOpen(false)
    onFinished?.()
  }

  if (!open) return null

  const current = STEPS[step]!
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 sm:p-4"
      role="complementary"
      aria-label="Sherhood walkthrough"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[#ccff00]/25 bg-[#0a0a0a]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
      >
        <div className="relative px-4 pb-4 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ccff00]/80">
                Tip {step + 1} / {STEPS.length}
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">{current.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{current.body}</p>
            </div>
            <button
              type="button"
              onClick={() => finish("skipped")}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              Dismiss
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex size-10 items-center justify-center rounded-xl border border-[#ccff00]/25 bg-[#ccff00]/10 text-[#ccff00]"
              >
                <Icon className="size-5" aria-hidden />
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-1 gap-1" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    i <= step ? "bg-[#ccff00]" : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {step > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <span className="flex-1" />
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              {"href" in current && current.href ? (
                <Link
                  href={current.href}
                  onClick={() => {
                    if (isLast) finish("done")
                  }}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {current.cta}
                </Link>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (isLast) finish("done")
                  else setStep((s) => s + 1)
                }}
              >
                {isLast ? "Got it" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
