"use client"

import { type ReactNode, useState } from "react"
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit"
import { WagmiProvider } from "wagmi"
import { mainnet, base, arbitrum, optimism, polygon } from "wagmi/chains"
import { MotionConfig } from "framer-motion"
import { robinhood } from "@/lib/chain"
import { OnboardingHost } from "@/components/onboarding/onboarding-host"
import "@rainbow-me/rainbowkit/styles.css"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo"

const wagmiConfig = getDefaultConfig({
  appName: "Sherhood",
  projectId,
  chains: [robinhood, mainnet, base, arbitrum, optimism, polygon],
  ssr: true,
})

/** Heavy wallet stack — loaded only after wallet boot. */
export function WalletShell({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
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
        <MotionConfig reducedMotion="user">
          {children}
          <OnboardingHost />
        </MotionConfig>
      </RainbowKitProvider>
    </WagmiProvider>
  )
}
