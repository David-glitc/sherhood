"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useReadContract } from "wagmi"
import { toast } from "sonner"
import { potFactoryConfig } from "@/lib/contracts"
import { allVisiblePots } from "@/lib/hidden-pots"
import { basketName } from "@/lib/basket-name"

const SEEN_KEY = "sherhood.seenPots.v1"

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr.map((a) => a.toLowerCase()))
  } catch {
    return new Set()
  }
}

function writeSeen(set: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

/** Toast when a new factory pot appears (session-scoped). */
export function ProtocolActivityToasts() {
  const router = useRouter()
  const primed = useRef(false)
  const { data } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
    query: { refetchInterval: 20_000 },
  })

  useEffect(() => {
    const pots = allVisiblePots((data as `0x${string}`[] | undefined) ?? []).map((a) =>
      a.toLowerCase()
    )
    if (pots.length === 0) return

    const seen = readSeen()
    if (!primed.current) {
      primed.current = true
      for (const p of pots) seen.add(p)
      writeSeen(seen)
      return
    }

    const fresh = pots.filter((p) => !seen.has(p))
    if (fresh.length === 0) return

    for (const addr of fresh) {
      seen.add(addr)
      const name = basketName(addr)
      toast.success(`New pool · ${name}`, {
        description: "Open to mint a Sherd",
        action: {
          label: "Open",
          onClick: () => router.push(`/pools/${addr}`),
        },
        duration: 10_000,
      })
    }
    writeSeen(seen)
  }, [data, router])

  return null
}
