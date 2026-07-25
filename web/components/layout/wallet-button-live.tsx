"use client"

import { useState } from "react"
import Link from "next/link"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useDisconnect } from "wagmi"
import { LogOut } from "lucide-react"
import { UserAvatar } from "@/components/profile/user-avatar"
import { useProfiles } from "@/hooks/use-profiles"
import { cn } from "@/lib/utils"

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

function ConnectedChip({
  address,
  openAccountModal,
  className,
}: {
  address: string
  openAccountModal: () => void
  className?: string
}) {
  const { get } = useProfiles([address])
  const { disconnect } = useDisconnect()
  const [menuOpen, setMenuOpen] = useState(false)
  const profile = get(address)
  const displayName = profile?.name?.trim() || truncateAddress(address)
  const profileHref = "/profile"

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "group relative inline-flex h-10 max-w-[11.5rem] items-center gap-1 overflow-hidden rounded-full sm:max-w-[12.5rem]",
          "border border-white/15 bg-gradient-to-b from-white/[0.12] to-white/[0.03]",
          "pl-1 pr-1 text-[13px] font-semibold text-[#e5e7eb]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_28px_rgba(0,0,0,0.5)]",
          "backdrop-blur-2xl"
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent"
        />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          className="inline-flex items-center rounded-full transition hover:border-[#ccff00]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50"
        >
          <UserAvatar
            address={address}
            avatarId={profile?.avatarId}
            name={displayName}
            size={28}
            className="ring-1 ring-white/20"
          />
        </button>
        <Link
          href={profileHref}
          className="min-w-0 truncate pr-1 tracking-tight transition hover:text-[#ccff00]"
          title="Open profile"
        >
          {displayName}
        </Link>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
            <Link
              href={profileHref}
              className="block px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-[#ccff00]"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
            <button
              type="button"
              className="block w-full px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
              onClick={() => {
                setMenuOpen(false)
                openAccountModal()
              }}
            >
              Wallet
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10"
              onClick={() => {
                setMenuOpen(false)
                disconnect()
              }}
            >
              <LogOut className="size-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** RainbowKit live button — loaded only after wallet boot (separate chunk). */
export function WalletButtonLive({ className = "" }: { className?: string }) {
  const { address } = useAccount()

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== "loading"
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated")

        if (ready && !connected && typeof window !== "undefined") {
          try {
            if (sessionStorage.getItem("sherhood.openConnect") === "1") {
              sessionStorage.removeItem("sherhood.openConnect")
              queueMicrotask(() => openConnectModal())
            }
          } catch {
            /* ignore */
          }
        }

        if (!ready) {
          return (
            <div
              className={cn(
                "h-10 w-[7.5rem] shrink-0 animate-pulse rounded-full border border-white/10 bg-white/[0.04]",
                className
              )}
              aria-hidden
            />
          )
        }

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={cn(
                "group relative inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-full",
                "border border-white/15 bg-white/[0.06] px-4 text-[13px] font-semibold text-[#e5e7eb]",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.45)]",
                "backdrop-blur-xl transition hover:border-[#ccff00]/45 hover:bg-white/[0.1]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50",
                className
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent"
              />
              <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
              Connect
            </button>
          )
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-red-400/40",
                "bg-red-500/10 px-4 text-[13px] font-semibold text-red-200 backdrop-blur-xl",
                className
              )}
            >
              Wrong network
            </button>
          )
        }

        return (
          <ConnectedChip
            address={address || account.address}
            openAccountModal={openAccountModal}
            className={className}
          />
        )
      }}
    </ConnectButton.Custom>
  )
}
