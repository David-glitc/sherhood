import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Shared narrow page frame for app surfaces */
export function PageShell({
  children,
  className,
  narrow = false,
  wide = false,
}: {
  children: ReactNode
  className?: string
  narrow?: boolean
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        "product-page",
        narrow ? "page-container-narrow" : wide ? "page-container-wide" : "page-container",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-8 max-w-2xl sm:mb-10">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sherhood">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
      {description && (
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
      {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="page-container-wide grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Experimental software — full risk exclusion
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">
          Sherhood is experimental, unfinished software provided <strong className="font-semibold text-foreground">AS IS</strong>,
          with no warranties of any kind. It is not a bank, broker, exchange, investment adviser, or
          licensed financial product. You may lose some or all funds. On-chain transactions are
          irreversible. Nothing on this site is legal, tax, or investment advice. Use is entirely at
          your own risk. See{" "}
          <Link href="/legal/terms" className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        </div>

        <nav aria-label="Footer" className="flex max-w-md flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground lg:justify-end">
          <Link href="/app" className="touch-target inline-flex items-center hover:text-primary">
            Baskets
          </Link>
          <Link href="/docs/getting-started" className="touch-target inline-flex items-center hover:text-primary">
            Docs
          </Link>
          <Link href="/marketplace" className="touch-target inline-flex items-center hover:text-primary">
            Trade
          </Link>
          <Link href="/profile" className="touch-target inline-flex items-center hover:text-primary">
            Profile
          </Link>
          <Link href="/legal/terms" className="touch-target inline-flex items-center hover:text-primary">
            Terms
          </Link>
          <Link href="/legal/privacy" className="touch-target inline-flex items-center hover:text-primary">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
