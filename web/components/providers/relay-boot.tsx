"use client"

import { type ReactNode, useMemo } from "react"
import {
  RelayKitProvider,
  type RelayKitTheme,
} from "@relayprotocol/relay-kit-ui"
import { useRelayChains } from "@relayprotocol/relay-kit-hooks"
import {
  MAINNET_RELAY_API,
  convertViemChainToRelayChain,
} from "@relayprotocol/relay-sdk"
import { mainnet, base } from "wagmi/chains"
import { robinhood } from "@/lib/chain"
import "@relayprotocol/relay-kit-ui/styles.css"

const fallbackRelayChains = [
  convertViemChainToRelayChain(mainnet),
  convertViemChainToRelayChain(base),
  convertViemChainToRelayChain(robinhood),
]

const relayTheme: RelayKitTheme = {
  font: "var(--font-poppins), system-ui, sans-serif",
  primaryColor: "#ccff00",
  focusColor: "#ccff00",
  text: {
    subtle: "#999999",
  },
}

export function RelayBoot({ children }: { children: ReactNode }) {
  const { chains } = useRelayChains(MAINNET_RELAY_API)
  const relayChains = useMemo(
    () => (chains && chains.length > 0 ? chains : fallbackRelayChains),
    [chains]
  )

  return (
    <RelayKitProvider
      options={{
        appName: "Sherhood",
        baseApiUrl: MAINNET_RELAY_API,
        chains: relayChains,
        themeScheme: "dark",
      }}
      theme={relayTheme}
    >
      {children}
    </RelayKitProvider>
  )
}
