"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

/** Lightweight native tooltip — keeps UI copy out of the main layout. */
export function Tip({
  text,
  children,
  className,
}: {
  text: string
  children?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 align-middle", className)}
      title={text}
    >
      {children}
      <Info
        className="size-3.5 shrink-0 text-muted-foreground/80"
        aria-hidden
      />
      <span className="sr-only">{text}</span>
    </span>
  )
}
