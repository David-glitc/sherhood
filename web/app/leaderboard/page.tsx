"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { buttonVariants } from "@/components/ui/button"
import { UserChip } from "@/components/profile/user-chip"
import { useProfiles } from "@/hooks/use-profiles"
import { profilePath, type UserProfile } from "@/lib/user-profile"
import { isProtocolOpsName, isProtocolOpsWallet } from "@/lib/protocol-ops"
import { cn } from "@/lib/utils"

type XpRow = {
  wallet: string
  xp: number
  actions: number
  streak: number
  lastDay: string
}

type BoardRow = XpRow & {
  joinedAt: number
}

export default function LeaderboardPage() {
  const { address } = useAccount()
  const [xpRows, setXpRows] = useState<XpRow[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const [xpRes, peopleRes] = await Promise.all([
          fetch("/api/xp", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/profiles?mode=directory", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ])
        if (!xpRes.ok) throw new Error("scores unavailable")
        const xpJson = (await xpRes.json()) as { leaderboard?: XpRow[] }
        const peopleJson = peopleRes.ok
          ? ((await peopleRes.json()) as { profiles?: UserProfile[] })
          : { profiles: [] }

        setXpRows(
          (xpJson.leaderboard ?? []).filter((row) => !isProtocolOpsWallet(row.wallet))
        )
        setProfiles(
          (peopleJson.profiles ?? []).filter(
            (profile) =>
              !isProtocolOpsWallet(profile.address) && !isProtocolOpsName(profile.name)
          )
        )
        setFailed(false)
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const visibleRows = useMemo(() => {
    const merged = new Map<string, BoardRow>()

    for (const row of xpRows) {
      if (isProtocolOpsWallet(row.wallet)) continue
      merged.set(row.wallet.toLowerCase(), {
        ...row,
        joinedAt: Number.MAX_SAFE_INTEGER,
      })
    }

    for (const profile of profiles) {
      if (!profile.address) continue
      if (isProtocolOpsWallet(profile.address) || isProtocolOpsName(profile.name)) continue
      const key = profile.address.toLowerCase()
      const existing = merged.get(key)
      if (existing) {
        merged.set(key, {
          ...existing,
          joinedAt: profile.updatedAt || Number.MAX_SAFE_INTEGER,
        })
      } else {
        merged.set(key, {
          wallet: profile.address,
          xp: 0,
          actions: 0,
          streak: 0,
          lastDay: "",
          joinedAt: profile.updatedAt || Number.MAX_SAFE_INTEGER,
        })
      }
    }

    if (address && !isProtocolOpsWallet(address)) {
      const key = address.toLowerCase()
      if (!merged.has(key)) {
        merged.set(key, {
          wallet: address,
          xp: 0,
          actions: 0,
          streak: 0,
          lastDay: "",
          joinedAt: Number.MAX_SAFE_INTEGER,
        })
      }
    }

    return [...merged.values()].sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp
      if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt
      return a.wallet.localeCompare(b.wallet)
    })
  }, [xpRows, profiles, address])

  const wallets = useMemo(() => visibleRows.map((r) => r.wallet), [visibleRows])
  const { get } = useProfiles(wallets)

  const mine = address
    ? visibleRows.find((r) => r.wallet.toLowerCase() === address.toLowerCase())
    : undefined
  const mineProfile = address ? get(address) : null
  const mineRank = mine
    ? visibleRows.findIndex((r) => r.wallet.toLowerCase() === mine.wallet.toLowerCase()) + 1
    : 0

  const podium = visibleRows.slice(0, 3)
  const rest = visibleRows.slice(3)

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Community"
        title="Leaderboard"
        description="Ranked by XP. Players without XP are ordered by when they joined."
        actions={
          <Link href="/people" className={buttonVariants({ variant: "outline" })}>
            People
          </Link>
        }
      />

      {mine ? (
        <section
          className="mb-8 overflow-hidden rounded-2xl border border-[#ccff00]/25 bg-gradient-to-br from-[#ccff00]/10 via-[#0a0a0a] to-black p-5 sm:p-6"
          aria-label="Your score"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ccff00]/80">
                Your rank · #{mineRank}
              </p>
              <div className="mt-3">
                <UserChip
                  address={mine.wallet}
                  name={mineProfile?.name}
                  avatarId={mineProfile?.avatarId}
                  showAddress
                  size={36}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums text-[#ccff00]">
                {mine.xp.toLocaleString()}
                <span className="ml-1 text-sm font-medium text-white/45">XP</span>
              </p>
              <p className="mt-1 text-xs text-white/45">
                {mine.xp > 0
                  ? `${mine.streak}d streak · ${mine.actions} actions`
                  : "Joined · no XP yet"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3" aria-label="Loading leaderboard">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
            >
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 sm:p-8" role="alert">
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
      ) : visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 sm:p-10">
          <h2 className="text-xl font-semibold">No players yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create a profile or mint a Sherd to appear here.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/profile" className={cn(buttonVariants())}>
              Create profile
            </Link>
            <Link href="/app" className={cn(buttonVariants({ variant: "outline" }))}>
              Browse pools
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {podium.length > 0 ? (
            <ol className="grid gap-3 sm:grid-cols-3">
              {podium.map((r, i) => {
                const p = get(r.wallet)
                const isYou =
                  !!address && r.wallet.toLowerCase() === address.toLowerCase()
                const accent =
                  i === 0 ? "border-[#ccff00]/40 bg-[#ccff00]/8" : "border-white/10 bg-white/[0.03]"
                return (
                  <li
                    key={r.wallet}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
                      accent,
                      isYou && "ring-1 ring-[#ccff00]/50"
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      #{i + 1}
                      {i === 0 ? " · Lead" : ""}
                    </p>
                    <div className="mt-3">
                      <UserChip
                        address={r.wallet}
                        name={p?.name}
                        avatarId={p?.avatarId}
                        href={p?.name ? profilePath(p) : undefined}
                        showAddress
                        size={32}
                      />
                    </div>
                    <p className="mt-4 text-2xl font-semibold tabular-nums text-white">
                      {r.xp.toLocaleString()}
                      <span className="ml-1 text-xs font-medium text-white/40">XP</span>
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {r.xp > 0
                        ? `${r.streak}d streak · ${r.actions} actions`
                        : "Joined · no XP yet"}
                    </p>
                  </li>
                )
              })}
            </ol>
          ) : null}

          {rest.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080808]">
              <div className="hidden grid-cols-[48px_minmax(0,1fr)_88px_100px] gap-3 border-b border-white/8 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35 sm:grid">
                <span>#</span>
                <span>Player</span>
                <span className="text-right">Streak</span>
                <span className="text-right">XP</span>
              </div>
              {rest.map((r, idx) => {
                const rank = idx + 4
                const isYou =
                  !!address && r.wallet.toLowerCase() === address.toLowerCase()
                const p = get(r.wallet)
                return (
                  <div
                    key={r.wallet}
                    className={cn(
                      "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-sm sm:grid-cols-[48px_minmax(0,1fr)_88px_100px] sm:px-5",
                      idx > 0 && "border-t border-white/[0.06]",
                      isYou && "bg-[#ccff00]/[0.06]"
                    )}
                  >
                    <span className="font-mono text-white/35">{rank}</span>
                    <UserChip
                      address={r.wallet}
                      name={p?.name}
                      avatarId={p?.avatarId}
                      href={p?.name ? profilePath(p) : undefined}
                      showAddress
                      className={isYou ? "text-[#ccff00]" : undefined}
                    />
                    <span className="hidden text-right text-white/40 sm:block">
                      {r.xp > 0 ? `${r.streak}d` : "—"}
                    </span>
                    <span className="text-right font-semibold tabular-nums text-white">
                      {r.xp.toLocaleString()}
                      <span className="block text-[10px] font-normal uppercase tracking-wide text-white/35 sm:hidden">
                        XP · {r.xp > 0 ? `${r.streak}d` : "joined"}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}
