"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProfiles } from "@/hooks/use-profiles"
import {
  DWELL_MINT_SESSION_KEY,
  profileLooksComplete,
  readOnboardingState,
} from "@/lib/onboarding"
import { cn } from "@/lib/utils"

const DWELL_MS = 50_000

/** After walkthrough done/skipped + ~50s on-site, prompt mint/fund once per session. */
export function DwellMintModal() {
  const { address, isConnected } = useAccount()
  const { get } = useProfiles(address ? [address] : [])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (sessionStorage.getItem(DWELL_MINT_SESSION_KEY) === "1") return
    } catch {
      return
    }

    let timeoutId: number | undefined
    let pollId: number | undefined

    const arm = () => {
      const onboarding = readOnboardingState()
      if (onboarding === "pending") return false
      try {
        if (sessionStorage.getItem(DWELL_MINT_SESSION_KEY) === "1") return true
      } catch {
        return true
      }
      timeoutId = window.setTimeout(() => {
        try {
          if (sessionStorage.getItem(DWELL_MINT_SESSION_KEY) === "1") return
          setOpen(true)
        } catch {
          /* ignore */
        }
      }, DWELL_MS)
      return true
    }

    if (!arm()) {
      pollId = window.setInterval(() => {
        if (arm() && pollId) window.clearInterval(pollId)
      }, 2000)
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      if (pollId) window.clearInterval(pollId)
    }
  }, [])

  const dismiss = () => {
    try {
      sessionStorage.setItem(DWELL_MINT_SESSION_KEY, "1")
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  const profile = address ? get(address) : null
  const needsProfile = isConnected && !profileLooksComplete(profile)
  const onboardPot = process.env.NEXT_PUBLIC_ONBOARDING_POT?.trim()

  const openConnect = () => {
    try {
      sessionStorage.setItem("sherhood.openConnect", "1")
    } catch {
      /* ignore */
    }
    dismiss()
    window.location.href = "/app"
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss()
        else setOpen(true)
      }}
    >
      <DialogContent className="border-border bg-[#080808] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Mint your first Sherd</DialogTitle>
          <DialogDescription>
            Fund a pool with a small deposit to mint a sealed Sherd. Reveal happens when the pool
            closes — protocol-honest, no shortcuts.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {!isConnected ? (
            <Button type="button" onClick={openConnect} className="min-h-11 w-full">
              Connect wallet
            </Button>
          ) : needsProfile ? (
            <Link
              href="/profile"
              onClick={dismiss}
              className={cn(buttonVariants(), "min-h-11 w-full")}
            >
              Set up profile
            </Link>
          ) : (
            <Link
              href={onboardPot ? `/pools/${onboardPot}` : "/app"}
              onClick={dismiss}
              className={cn(buttonVariants(), "min-h-11 w-full")}
            >
              {onboardPot ? "Open Onboarding pool" : "Browse pools"}
            </Link>
          )}
          <Link
            href="/create"
            onClick={dismiss}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full")}
          >
            Or create a pool
          </Link>
          <Button type="button" variant="ghost" className="min-h-10 w-full" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
