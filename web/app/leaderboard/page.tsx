"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { ShrhLuckPill } from "@/components/layout/shrh-luck-pill"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Row = {
  wallet: string
  xp: number
  actions: number
  streak: number
  lastDay: string
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function LeaderboardPage() {
  const { address } = useAccount()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/xp", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("scores unavailable")
        return r.json()
      })
      .then((json: { leaderboard?: Row[] }) => setRows(json.leaderboard ?? []))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const mine = address
    ? rows.find((r) => r.wallet.toLowerCase() === address.toLowerCase())
    : undefined

  return (
    <PageShell>
      <PageHeader
        eyebrow="Community"
        title="Leaderboard"
        description="XP tracks funding, creating, claiming, and trading. Consecutive active days build your streak."
        actions={
          <>
            <ShrhLuckPill />
            <Link href="/docs/xp" className={buttonVariants({ variant: "outline" })}>
              Read XP rules
            </Link>
          </>
        }
      />

      {mine && (
        <section className="product-surface mb-6 flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Your score">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your score</p>
            <p className="mt-1 font-mono text-sm text-foreground">{shortAddr(mine.wallet)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-semibold tabular-nums text-primary">{mine.xp.toLocaleString()} XP</p>
            <p className="text-xs text-muted-foreground">
              {mine.streak}d streak · {mine.actions} actions
            </p>
          </div>
        </section>
      )}

      {loading ? (
        <div className="product-surface flex flex-col gap-3 p-4" aria-label="Loading leaderboard">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 py-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="product-surface p-6 sm:p-8" role="alert">
          <h2 className="text-lg font-semibold">Scores could not load</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The chain indexer did not respond. Reload this page to try again.
          </p>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
            onClick={() => window.location.reload()}
          >
            Reload scores
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="product-surface p-6 sm:p-10">
          <h2 className="text-xl font-semibold">No activity scored yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Fund an open basket to record the first action and start a streak.
          </p>
          <Link href="/app" className={cn(buttonVariants(), "mt-5")}>
            Browse baskets
          </Link>
        </div>
      ) : (
        <div className="product-surface overflow-hidden">
          <div className="hidden grid-cols-[48px_minmax(0,1fr)_100px_100px] gap-3 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid">
            <span>#</span>
            <span>Wallet</span>
            <span className="text-right">Streak</span>
            <span className="text-right">XP</span>
          </div>
          {rows.map((r, i) => {
            const isYou =
              !!address && r.wallet.toLowerCase() === address.toLowerCase()
            return (
              <div
                key={r.wallet}
                className={cn(
                  "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-sm sm:grid-cols-[48px_minmax(0,1fr)_100px_100px] sm:px-5",
                  i > 0 && "border-t border-border",
                  isYou && "bg-primary/[0.06]"
                )}
              >
                <span className="font-mono text-muted-foreground">{i + 1}</span>
                <span className={cn("min-w-0 truncate font-mono", isYou ? "text-primary" : "text-foreground")}>
                  {shortAddr(r.wallet)}
                  {isYou ? " · you" : ""}
                </span>
                <span className="hidden text-right text-muted-foreground sm:block">{r.streak}d</span>
                <span className="text-right font-semibold tabular-nums text-foreground">
                  {r.xp.toLocaleString()}
                  <span className="block text-[10px] font-normal uppercase tracking-wide text-muted-foreground sm:hidden">
                    XP · {r.streak}d
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
