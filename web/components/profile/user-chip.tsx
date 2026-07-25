"use client"

import Link from "next/link"
import { UserAvatar } from "@/components/profile/user-avatar"
import { profilePath } from "@/lib/user-profile"
import { cn } from "@/lib/utils"

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

type UserChipProps = {
  address?: string | null
  name?: string | null
  slug?: string | null
  avatarId?: number | null
  /**
   * Profile / external URL. When omitted and `name` is set, links to `/u/[slug]`.
   * Pass `null` to force a non-link chip.
   */
  href?: string | null
  size?: number
  className?: string
  monoFallback?: boolean
  /** Show truncated wallet under the name (leaderboard / people). */
  showAddress?: boolean
}

export function UserChip({
  address,
  name,
  slug,
  avatarId,
  href,
  size = 28,
  className,
  monoFallback = true,
  showAddress = false,
}: UserChipProps) {
  const label =
    name ||
    (address && monoFallback
      ? shortAddr(address)
      : address || "—")

  if (!address && !name) {
    return <span className="text-muted-foreground">—</span>
  }

  const resolvedHref =
    href === null
      ? undefined
      : href !== undefined
        ? href
        : name
          ? profilePath(slug ? { name, slug } : name)
          : address
            ? "/profile"
            : undefined

  const inner = (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <UserAvatar address={address} avatarId={avatarId} name={name} size={size} />
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-sm",
            name ? "font-medium text-foreground" : "font-mono text-muted-foreground"
          )}
        >
          {label}
        </span>
        {showAddress && address && name ? (
          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
            {shortAddr(address)}
          </span>
        ) : null}
      </span>
    </span>
  )

  if (resolvedHref) {
    const external = resolvedHref.startsWith("http")
    if (external) {
      return (
        <a
          href={resolvedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 transition hover:opacity-90"
        >
          {inner}
        </a>
      )
    }
    return (
      <Link href={resolvedHref} className="inline-flex min-w-0 transition hover:opacity-90">
        {inner}
      </Link>
    )
  }

  return inner
}
