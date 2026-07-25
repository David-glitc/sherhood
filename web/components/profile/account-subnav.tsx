"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/profile", id: "overview", label: "Overview" },
  { href: "/inventory", id: "collection", label: "Collection" },
] as const

/** Shared Profile ↔ Collection chrome so account surfaces feel one product. */
export function AccountSubnav({ className }: { className?: string }) {
  const pathname = usePathname()
  const active = pathname.startsWith("/inventory") ? "collection" : "overview"

  return (
    <nav
      aria-label="Account"
      className={cn(
        "mb-6 inline-flex h-10 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1",
        className
      )}
    >
      {TABS.map((t) => {
        const isActive = active === t.id
        return (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold transition",
              isActive
                ? "bg-[#ccff00]/15 text-[#ccff00]"
                : "text-white/50 hover:text-white"
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
