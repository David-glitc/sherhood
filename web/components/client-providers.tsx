"use client"

import { type ReactNode, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WalletBootProvider, useWalletBoot } from "@/components/providers/wallet-boot"
import { isMarketingPath } from "@/lib/marketing-path"
import { usePoolNamesHydration } from "@/hooks/use-pool-names"
import { ProtocolActivityToasts } from "@/hooks/use-protocol-activity-toasts"

const WalletShell = dynamic(
  () => import("@/components/providers/wallet-shell").then((m) => m.WalletShell),
  { ssr: false }
)

const RelayBoot = dynamic(
  () => import("@/components/providers/relay-boot").then((m) => m.RelayBoot),
  { ssr: false }
)

function needsRelay(pathname: string): boolean {
  return (
    pathname.startsWith("/bridge") ||
    pathname.startsWith("/create") ||
    pathname.startsWith("/deck") ||
    pathname.startsWith("/buy-shrd")
  )
}

function ProvidersInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/"
  const { ready } = useWalletBoot()
  const withRelay = needsRelay(pathname)
  usePoolNamesHydration()

  useEffect(() => {
    if (isMarketingPath(pathname)) {
      void import("@/components/providers/wallet-shell")
    }
  }, [pathname])

  if (!ready) return <>{children}</>

  const shell = (
    <WalletShell>
      <ProtocolActivityToasts />
      {children}
    </WalletShell>
  )
  return withRelay ? <RelayBoot>{shell}</RelayBoot> : shell
}

export function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <WalletBootProvider>
        <ProvidersInner>{children}</ProvidersInner>
      </WalletBootProvider>
    </QueryClientProvider>
  )
}
