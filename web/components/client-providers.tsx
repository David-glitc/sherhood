"use client"

import { type ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { robinhoodChain } from "@/lib/chain"
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum"

const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(),
  },
})

export function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}
