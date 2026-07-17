"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { WalletButton } from "@/components/layout/wallet-button"
import { EthUsdTicker } from "@/components/layout/eth-usd-ticker"
import { BrandWordmark } from "@/components/layout/brand"
import { cn } from "@/lib/utils"
import { OPENSEA_COLLECTION_URL, TELEGRAM_URL } from "@/lib/protocol"

const navLinks = [
  { href: "/app", label: "Baskets" },
  { href: "/inventory", label: "Cards" },
  { href: "/marketplace", label: "Trade" },
  { href: "/create", label: "Create" },
  { href: "/docs", label: "Docs" },
  { href: "/profile", label: "Profile" },
]

export function Header() {
  const pathname = usePathname()
  const isLanding = pathname === "/"
  const reduceMotion = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const solid = !isLanding || scrolled || menuOpen

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
              "hidden flex-1 items-center justify-center gap-5 transition-opacity duration-300 lg:flex",
              isLanding && !scrolled ? "opacity-55 hover:opacity-100" : "opacity-100"
            )}
          >
            {navLinks.map((l) => {
              const active =
                l.href === "/docs"
                  ? pathname.startsWith("/docs")
                  : pathname === l.href || pathname.startsWith(l.href + "/")
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-1 py-2 text-[13px] font-medium tracking-wide transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    isLanding && !scrolled && !active && "text-white/55 hover:text-white"
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "rounded-md px-1 py-2 text-[13px] font-medium tracking-wide transition-colors hover:text-primary",
                isLanding && !scrolled ? "text-white/70" : "text-muted-foreground"
              )}
            >
              Telegram
            </a>
            {OPENSEA_COLLECTION_URL ? (
              <a
                href={OPENSEA_COLLECTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "rounded-md px-1 py-2 text-[13px] font-medium tracking-wide transition-colors hover:text-primary",
                  isLanding && !scrolled ? "text-white/70" : "text-muted-foreground"
                )}
              >
                OpenSea
              </a>
            ) : (
              <Link
                href="/docs/opensea"
                className={cn(
                  "rounded-md px-1 py-2 text-[13px] font-medium tracking-wide transition-colors hover:text-primary",
                  isLanding && !scrolled ? "text-white/70" : "text-muted-foreground"
                )}
              >
                OpenSea
              </Link>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <EthUsdTicker
              className={cn(
                "hidden sm:inline-flex",
                isLanding && !scrolled && "opacity-70"
              )}
            />
            <WalletButton />
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

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              id="mobile-navigation"
              aria-label="Main navigation"
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto lg:hidden"
            >
              <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
                {navLinks.map((l) => {
                  const active =
                    l.href === "/docs"
                      ? pathname.startsWith("/docs")
                      : pathname === l.href || pathname.startsWith(l.href + "/")
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "touch-target flex items-center rounded-lg px-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {l.label}
                    </Link>
                  )
                })}
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="touch-target flex items-center rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Telegram
                </a>
                {OPENSEA_COLLECTION_URL ? (
                  <a
                    href={OPENSEA_COLLECTION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="touch-target flex items-center rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    OpenSea
                  </a>
                ) : (
                  <Link
                    href="/docs/opensea"
                    onClick={() => setMenuOpen(false)}
                    className="touch-target flex items-center rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    OpenSea
                  </Link>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
