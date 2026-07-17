"use client"

import { type ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit"
import { WagmiProvider } from "wagmi"
import { MotionConfig } from "framer-motion"
import { robinhood } from "@/lib/chain"
import "@rainbow-me/rainbowkit/styles.css"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo"

const wagmiConfig = getDefaultConfig({
  appName: "Sherhood",
  projectId,
  chains: [robinhood],
  ssr: true,
})

export function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={robinhood}
          theme={darkTheme({
            accentColor: "#ccff00",
            accentColorForeground: "#050806",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
