"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import {
  Layers,
  PlusCircle,
  LayoutGrid,
  ArrowLeftRight,
  Users,
  Trophy,
  UserRound,
  Route,
  Presentation,
  Map,
  BookOpen,
  MoreHorizontal,
  MessageCircle,
  ExternalLink,
} from "lucide-react"
import { WalletButton } from "@/components/layout/wallet-button"
import { BrandWordmark } from "@/components/layout/brand"
import { SoundToggle } from "@/components/layout/sound-toggle"
import { cn } from "@/lib/utils"
import {
  OPENSEA_COLLECTION_URL,
  TELEGRAM_URL,
  X_HANDLE,
  X_URL,
} from "@/lib/protocol"

const EthUsdTicker = dynamic(
  () =>
    import("@/components/layout/eth-usd-ticker").then((m) => m.EthUsdTicker),
  {
    ssr: false,
    loading: () => (
      <span
        className="hidden h-10 min-w-[5.5rem] shrink-0 sm:inline-flex"
        aria-hidden
      />
    ),
  }
)

type NavIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

type NavLink = {
  href: string
  label: string
  icon: NavIcon
}

const primaryLinks: NavLink[] = [
  { href: "/app", label: "Pools", icon: Layers },
  { href: "/sherds", label: "Sherds", icon: LayoutGrid },
  { href: "/marketplace", label: "Market", icon: ArrowLeftRight },
  { href: "/create", label: "Create", icon: PlusCircle },
]

const moreLinks: NavLink[] = [
  { href: "/inventory", label: "My collection", icon: LayoutGrid },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/people", label: "People", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/bridge", label: "Bridge", icon: Route },
  { href: "/deck", label: "Deck", icon: Presentation },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/docs", label: "Docs", icon: BookOpen },
]

const mobileNavLinks = [...primaryLinks, ...moreLinks]

function XIcon({ className, ...props }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={props["aria-hidden"]}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

type ExternalSocial = {
  href: string
  label: string
  icon: NavIcon
}

const socialLinks: ExternalSocial[] = [
  { href: X_URL, label: `X @${X_HANDLE}`, icon: XIcon },
  { href: TELEGRAM_URL, label: "Telegram", icon: MessageCircle },
  { href: OPENSEA_COLLECTION_URL, label: "OpenSea", icon: ExternalLink },
]

function linkActive(pathname: string, href: string) {
  if (href === "/docs") return pathname.startsWith("/docs")
  return pathname === href || pathname.startsWith(href + "/")
}

export function Header() {
  const pathname = usePathname()
  const isLanding = pathname === "/"
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [moreOpen])

  const solid = !isLanding || scrolled || menuOpen
  const moreActive = moreLinks.some((l) => linkActive(pathname, l.href))
  const landingMuted = isLanding && !scrolled

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        solid
          ? "border-b border-border bg-background/95 shadow-lg backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="page-container-wide py-3">
        <div className="flex items-center justify-between gap-3">
          <BrandWordmark />

          <nav
            className={cn(
              "hidden flex-1 items-center justify-center gap-1 lg:flex",
              landingMuted ? "opacity-70 hover:opacity-100" : "opacity-100"
            )}
            aria-label="Primary"
          >
            {primaryLinks.map((l) => {
              const active = linkActive(pathname, l.href)
              const Icon = l.icon
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium tracking-wide transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    landingMuted && !active && "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                  {l.label}
                </Link>
              )
            })}

            <div
              ref={moreRef}
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setMoreOpen(false)
                }
              }}
            >
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium tracking-wide transition-colors",
                  moreActive || moreOpen
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  landingMuted && !moreActive && "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <MoreHorizontal className="size-3.5 shrink-0 opacity-80" aria-hidden />
                More
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute left-1/2 top-full z-50 mt-2 w-[22rem] -translate-x-1/2 rounded-xl border border-border bg-background p-2 shadow-xl"
                >
                  <div className="grid grid-cols-2 gap-0.5">
                    {moreLinks.map((l) => {
                      const Icon = l.icon
                      return (
                        <Link
                          key={l.href}
                          role="menuitem"
                          href={l.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            linkActive(pathname, l.href)
                              ? "bg-primary/15 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                          {l.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <SoundToggle className={cn("hidden sm:inline-flex", landingMuted && "opacity-70")} />
            <div
              className={cn("hidden items-center gap-0.5 md:flex", landingMuted && "opacity-70")}
              aria-label="Social"
            >
              {socialLinks.map((s) => {
                const Icon = s.icon
                return (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    aria-label={s.label}
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                      landingMuted && "text-white/55 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </a>
                )
              })}
            </div>
            <WalletButton />
            <EthUsdTicker
              className={cn(landingMuted && "opacity-70")}
            />
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((v) => !v)}
              className="touch-target inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-primary/50 lg:hidden"
            >
              <span className="sr-only">Menu</span>
              <span className="flex flex-col gap-1.5">
                <span
                  className={cn(
                    "block h-px w-4 bg-current transition",
                    menuOpen && "translate-y-[3.5px] rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "block h-px w-4 bg-current transition",
                    menuOpen && "-translate-y-[3.5px] -rotate-45"
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id="mobile-navigation"
            aria-label="Main navigation"
            className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto lg:hidden"
          >
            <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {mobileNavLinks.map((l) => {
                const active = linkActive(pathname, l.href)
                const Icon = l.icon
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "touch-target flex min-h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                    {l.label}
                  </Link>
                )
              })}
              <div className="mt-2 border-t border-white/10 pt-2">
                <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  External
                </p>
                {socialLinks.map((s) => {
                  const Icon = s.icon
                  return (
                    <a
                      key={s.href}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="touch-target flex min-h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-medium text-foreground hover:bg-muted"
                    >
                      <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                      {s.label}
                      <ExternalLink className="ml-auto size-3.5 opacity-40" aria-hidden />
                    </a>
                  )
                })}
              </div>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  )
}
