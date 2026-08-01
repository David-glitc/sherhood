import Link from "next/link"
import type { ReactNode } from "react"
import { MessageCircle, ExternalLink } from "lucide-react"
import { BrandLockup } from "@/components/layout/brand"
import {
  OPENSEA_COLLECTION_URL,
  TELEGRAM_URL,
  X_HANDLE,
  X_URL,
} from "@/lib/protocol"
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

const FOOTER_LINKS = [
  { href: "/app", label: "Pools" },
  { href: "/sherds", label: "Sherds" },
  { href: "/marketplace", label: "Market" },
  { href: "/create", label: "Create" },
  { href: "/inventory", label: "My collection" },
  { href: "/people", label: "People" },
  { href: "/leaderboard", label: "Board" },
  { href: "/docs/getting-started", label: "Docs" },
  { href: "/bridge", label: "Bridge" },
] as const

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-[#ccff00]/20 bg-[#050505]">
      <div className="page-container-wide py-8 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link href="/" className="inline-flex shrink-0">
              <BrandLockup height={36} />
            </Link>
            <p className="max-w-xs text-sm leading-5 text-white/45">
              Collect stocks like gacha cards on Robinhood Chain.{" "}
              <Link href="/roadmap" className="text-[#ccff00]/80 hover:text-[#ccff00]">
                V2 coming soon
              </Link>
              .
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/55"
          >
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-[#ccff00]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`X @${X_HANDLE}`}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-[#ccff00]/40 hover:text-[#ccff00]"
            >
              <XIcon className="size-4" />
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-[#ccff00]/40 hover:text-[#ccff00]"
            >
              <MessageCircle className="size-4" />
            </a>
            <a
              href={OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="OpenSea"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-[#ccff00]/40 hover:text-[#ccff00]"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/[0.06] pt-5 text-[11px] text-white/30 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl space-y-1">
            <p>© {new Date().getFullYear()} Sherhood</p>
            <p className="leading-relaxed text-white/25">
              Not financial advice. Sherds are on-chain ownership claims on Robinhood Chain stock
              tokens — markets move, liquidity varies, and you can lose value. Read the Terms.
            </p>
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end">
            <Link href="/legal/terms" className="hover:text-[#ccff00]">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-[#ccff00]">
              Privacy
            </Link>
            <Link href="/profile" className="hover:text-[#ccff00]">
              Profile
            </Link>
            <Link href="/roadmap" className="hover:text-[#ccff00]">
              Roadmap
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
