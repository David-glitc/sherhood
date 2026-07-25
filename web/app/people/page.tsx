"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { UserChip } from "@/components/profile/user-chip"
import { SendAssetsPanel } from "@/components/send/send-assets-panel"
import { ShareButton } from "@/components/share/share-button"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { profilePath, type UserProfile } from "@/lib/user-profile"
import { cn } from "@/lib/utils"

export default function PeoplePage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/profiles?mode=directory", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("unavailable")
        return r.json()
      })
      .then((json: { profiles?: UserProfile[] }) => setProfiles(json.profiles ?? []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Community"
        title="People"
        description="Find players by unique name."
        actions={
          <>
            <Link href="/leaderboard" className={buttonVariants({ variant: "outline" })}>
              Leaderboard
            </Link>
            <Link href="/profile" className={buttonVariants({ variant: "ghost" })}>
              Profile
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,380px)]">
        <section className="product-surface overflow-hidden">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : failed ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Could not load.</p>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">No profiles yet.</p>
              <Link href="/profile" className={cn(buttonVariants(), "mt-4")}>
                Create yours
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {profiles.map((p) => {
                const href = profilePath(p)
                return (
                  <li key={p.address} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <Link href={href} className="min-w-0 flex-1">
                      <UserChip
                        address={p.address}
                        name={p.name}
                        avatarId={p.avatarId}
                        size={36}
                        showAddress
                        href={null}
                      />
                      <p className="mt-0.5 pl-11 text-[11px] text-muted-foreground">
                        @{p.slug || p.name}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {p.allowReceive && (
                        <span
                          className="rounded-full border border-[#ccff00]/30 bg-[#ccff00]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ccff00]"
                          title="Accepts Sherds & tokens"
                        >
                          In
                        </span>
                      )}
                      <ShareButton
                        path={href}
                        title={`${p.name} on Sherhood`}
                        text={`Check out ${p.name} on Sherhood`}
                        compact
                      />
                      <Link
                        href={href}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <SendAssetsPanel />
      </div>
    </PageShell>
  )
}
