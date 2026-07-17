"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DOCS_NAV } from "@/lib/docs"
import { cn } from "@/lib/utils"

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="-mx-4 border-y border-border px-4 py-2 sm:-mx-8 sm:px-8 lg:sticky lg:top-20 lg:mx-0 lg:h-[calc(100dvh-6rem)] lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-0 lg:p-0">
      <nav className="scroll-mask-x flex gap-2 pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0" aria-label="Documentation">
        {DOCS_NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "touch-target inline-flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground lg:bg-primary/10 lg:text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
