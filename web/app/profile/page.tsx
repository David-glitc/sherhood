"use client"

import { useState } from "react"
import Link from "next/link"
import { useAccount, useDisconnect } from "wagmi"
import { toast } from "sonner"
import { PageShell, PageHeader } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { WalletButton } from "@/components/layout/wallet-button"

function clearInterfaceData() {
  if (typeof window === "undefined") return

  const shouldDrop = (key: string) => {
    const k = key.toLowerCase()
    return (
      k.includes("wagmi") ||
      k.includes("rainbow") ||
      k.includes("rk-") ||
      k.includes("walletconnect") ||
      k.includes("wc@") ||
      k.includes("sherhood") ||
      k.includes("recentlyused")
    )
  }

  try {
    const lsKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) lsKeys.push(key)
    }
    for (const key of lsKeys) {
      if (shouldDrop(key)) localStorage.removeItem(key)
    }
  } catch {
    /* ignore quota / private mode */
  }

  try {
    sessionStorage.clear()
  } catch {
    /* ignore */
  }

  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim()
      if (!name) return
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })
  } catch {
    /* ignore */
  }
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  const onDelete = async () => {
    const ok = window.confirm(
      "Delete local Sherhood account data in this browser?\n\nThis disconnects your wallet here and clears interface storage. On-chain deposits, cards, and trades cannot be deleted."
    )
    if (!ok) return

    setPending(true)
    try {
      disconnect()
      clearInterfaceData()
      setDone(true)
      toast.success("Local account data cleared")
    } catch {
      toast.error("Could not clear all local data")
    } finally {
      setPending(false)
    }
  }

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Manage the wallet connected to this browser and clear interface data stored on this device."
      />

      <div className="flex flex-col gap-4">
        <section className="product-surface p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Wallet
          </p>
          {isConnected && address ? (
            <p className="mt-3 break-all font-mono text-sm text-foreground">{address}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No wallet connected</p>
          )}
          <div className="mt-4">
            <WalletButton />
          </div>
        </section>

        <section className="product-surface p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Legal
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sherhood is experimental software. Review our{" "}
            <Link href="/legal/terms" className="text-primary underline-offset-4 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="product-surface p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Browser data
          </p>
          <h2 className="mt-3 text-lg font-semibold text-foreground">Clear local account data</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Disconnects this wallet from the Sherhood UI in this browser and clears local/session
            storage used by the interface.{" "}
            <strong className="font-medium text-foreground">
              Blockchain data is not deleted
            </strong>{" "}
            (baskets, cards, trades stay on-chain and public).
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-5 min-h-11 w-full sm:w-auto"
            disabled={pending}
            onClick={onDelete}
          >
            {pending ? "Clearing data…" : "Clear local data"}
          </Button>
          {done ? (
            <p className="mt-3 text-sm text-primary" role="status">
              Local browser data cleared.
            </p>
          ) : null}
        </section>
      </div>
    </PageShell>
  )
}
