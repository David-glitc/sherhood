"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type ActivityItem = {
  text: string
  pot: string
  times: number
}

export function ActivityStripe({ className }: { className?: string }) {
  const [items, setItems] = useState<ActivityItem[]>([])

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((json: { items: ActivityItem[] }) => setItems(json.items ?? []))
      .catch(() => setItems([]))
  }, [])

  if (items.length === 0) return null

  const doubled = [...items, ...items]

  return (
    <div
      className={cn(
        "relative overflow-hidden border-y border-white/[0.06] bg-[#050505] py-2.5",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#050505] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#050505] to-transparent" />
      <div className="flex animate-activity-scroll gap-10 whitespace-nowrap px-4">
        {doubled.map((item, i) => (
          <Link
            key={`${item.pot}-${i}`}
            href="/app"
            aria-hidden={i >= items.length ? true : undefined}
            tabIndex={i >= items.length ? -1 : undefined}
            className={cn(
              "inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary",
              i >= items.length && "motion-duplicate"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sherhood/80" />
            <span>{item.text}</span>
            {item.times > 1 && (
              <span className="rounded-full bg-sherhood/15 px-2 py-0.5 text-[10px] font-bold text-sherhood">
                {item.times}×
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
