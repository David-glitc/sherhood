"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { cn } from "@/lib/utils"

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function WalletButton({ className = "" }: { className?: string }) {
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
          ready && account && chain && (!authenticationStatus || authenticationStatus === "authenticated")

        if (!ready) {
          return (
            <div
              className={cn(
                "h-10 w-[118px] animate-pulse rounded-full border border-white/10 bg-white/[0.04]",
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
                "group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full",
                "border border-white/15 bg-white/[0.06] px-4 text-[13px] font-semibold text-[#e5e7eb]",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.45)]",
                "backdrop-blur-xl transition hover:border-[#ccff00]/45 hover:bg-white/[0.1]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50",
                className
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
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
                "inline-flex h-10 items-center gap-2 rounded-full border border-red-400/40",
                "bg-red-500/10 px-4 text-[13px] font-semibold text-red-200 backdrop-blur-xl",
                className
              )}
            >
              Wrong network
            </button>
          )
        }

        return (
          <div className={cn("flex items-center gap-1.5", className)}>
            <button
              type="button"
              onClick={openChainModal}
              className={cn(
                "hidden h-10 items-center gap-1.5 rounded-full border border-white/10",
                "bg-white/[0.04] px-3 text-[12px] font-medium text-[#999999] backdrop-blur-xl",
                "transition hover:border-white/20 hover:text-[#e5e7eb] sm:inline-flex"
              )}
              title={chain.name}
            >
              {chain.hasIcon && chain.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  src={chain.iconUrl}
                  width={14}
                  height={14}
                  className="rounded-full"
                  style={{ background: chain.iconBackground }}
                />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
              )}
              <span className="max-w-[72px] truncate">{chain.name}</span>
            </button>

            <button
              type="button"
              onClick={openAccountModal}
              className={cn(
                "group relative inline-flex h-10 items-center gap-2.5 overflow-hidden rounded-full",
                "border border-white/15 bg-gradient-to-b from-white/[0.12] to-white/[0.03]",
                "pl-1.5 pr-3.5 text-[13px] font-semibold text-[#e5e7eb]",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_28px_rgba(0,0,0,0.5)]",
                "backdrop-blur-2xl transition hover:border-[#ccff00]/40 hover:from-white/[0.16]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50"
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent"
              />
              <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/20">
                {account.ensAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    src={account.ensAvatar}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="h-full w-full"
                    style={{
                      background: `conic-gradient(from 210deg, #ccff00, #333, #999, #ccff00)`,
                    }}
                  />
                )}
              </span>
              <span className="font-mono text-[12px] tracking-tight">
                {account.ensName ?? truncateAddress(account.address)}
              </span>
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
