"use client"

import Link from "next/link"
import { WalletButton } from "@/components/layout/wallet-button"

const links = [
  { href: "/app", label: "Pots" },
  { href: "/create", label: "Create" },
  { href: "/marketplace", label: "Market" },
  { href: "/inventory", label: "Cards" },
  { href: "/leaderboard", label: "Ranks" },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070a08]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight text-zinc-50">
          Sher<span className="text-sherhood">hood</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
          <WalletButton />
        </nav>
      </div>
    </header>
  )
}
