"use client"

import dynamic from "next/dynamic"
import { useWalletBoot } from "@/components/providers/wallet-boot"
import { cn } from "@/lib/utils"

function ConnectStub({ className = "" }: { className?: string }) {
  const { requestBoot } = useWalletBoot()
  return (
    <button
      type="button"
      onClick={() => {
        try {
          sessionStorage.setItem("sherhood.openConnect", "1")
        } catch {
          /* ignore */
        }
        requestBoot()
      }}
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
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
      <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
      Connect
    </button>
  )
}

const WalletButtonLive = dynamic(
  () =>
    import("@/components/layout/wallet-button-live").then((m) => m.WalletButtonLive),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-10 w-[7.5rem] shrink-0 animate-pulse rounded-full border border-white/10 bg-white/[0.04]"
        aria-hidden
      />
    ),
  }
)

/** Stub until wallet boot — keeps RainbowKit out of the header chunk. */
export function WalletButton({ className = "" }: { className?: string }) {
  const { ready } = useWalletBoot()
  if (!ready) return <ConnectStub className={className} />
  return <WalletButtonLive className={className} />
}
