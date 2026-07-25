"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Layers, LayoutGrid, UserRound, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { readOnboardingState, writeOnboardingState } from "@/lib/onboarding"
import { SHERHOOD_TAGLINE } from "@/lib/protocol"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Welcome to Sherhood",
    body: `${SHERHOOD_TAGLINE}. Mint a Sherd in a pool, then claim your share when it reveals.`,
  },
  {
    id: "pools",
    icon: Layers,
    title: "Sherd pools",
    body: "Open pools buy 2–5 Robinhood Chain stocks when they end. Pay with ETH, WETH, or USDG.",
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

  const current = STEPS[step]!
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) finish("skipped")
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-border bg-[#080808] p-0 sm:max-w-md"
      >
        <div className="relative overflow-hidden px-6 pb-6 pt-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-[#ccff00]/15 blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <DialogHeader className="gap-1 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ccff00]/80">
                Step {step + 1} / {STEPS.length}
              </p>
              <DialogTitle className="text-xl text-foreground">{current.title}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {current.body}
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              onClick={() => finish("skipped")}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              Skip
            </button>
          </div>

          <div className="relative mt-6 flex items-center gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex size-14 items-center justify-center rounded-2xl border border-[#ccff00]/25 bg-[#ccff00]/10 text-[#ccff00]"
              >
                <Icon className="size-6" aria-hidden />
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-1 gap-1.5" aria-hidden>
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

          <div className="relative mt-7 flex flex-wrap items-center gap-2">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
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
                  className={buttonVariants({ variant: "outline" })}
                >
                  {current.cta}
                </Link>
              ) : null}
              <Button
                type="button"
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
      </DialogContent>
    </Dialog>
  )
}
