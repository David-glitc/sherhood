"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useWalletClient } from "wagmi"
import { adaptViemWallet } from "@relayprotocol/relay-sdk"
import type { Token } from "@relayprotocol/relay-kit-ui"
import Link from "next/link"
import { robinhood } from "@/lib/chain"

/** Robinhood Chain native ETH — primary bridge destination. */
const ETH_ROBINHOOD: Token = {
  chainId: robinhood.id,
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  name: "Ether",
  symbol: "ETH",
  logoURI: "https://assets.relay.link/icons/1/light.png",
}

const ETH_MAINNET: Token = {
  chainId: 1,
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  name: "Ether",
  symbol: "ETH",
  logoURI: "https://assets.relay.link/icons/1/light.png",
}

const ETH_BASE: Token = {
  chainId: 8453,
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  name: "Ether",
  symbol: "ETH",
  logoURI: "https://assets.relay.link/icons/8453/light.png",
}

const SOL_NATIVE: Token = {
  chainId: 792703809,
  address: "11111111111111111111111111111111",
  decimals: 9,
  name: "Solana",
  symbol: "SOL",
  logoURI: "https://assets.relay.link/icons/792703809/light.png",
}

const SwapWidget = dynamic(
  () => import("@relayprotocol/relay-kit-ui").then((m) => m.SwapWidget),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
        Loading Relay…
      </div>
    ),
  }
)

const FROM_PRESETS = [
  { label: "From Ethereum", from: ETH_MAINNET },
  { label: "From Base", from: ETH_BASE },
  { label: "From Solana", from: SOL_NATIVE },
] as const

export function BridgeWidget() {
  const { openConnectModal } = useConnectModal()
  const { data: walletClient } = useWalletClient()
  const [fromToken, setFromToken] = useState<Token>(ETH_MAINNET)
  const [toToken, setToToken] = useState<Token>(ETH_ROBINHOOD)

  const adaptedWallet = useMemo(() => {
    if (!walletClient) return undefined
    try {
      return adaptViemWallet(walletClient)
    } catch {
      return undefined
    }
  }, [walletClient])

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="mb-4 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-center">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary">
          BRIDGE INTO ROBINHOOD CHAIN
        </p>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
          All Relay chains supported. Destination defaults to Robinhood — pick any source in the widget.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {FROM_PRESETS.map((preset) => {
          const active = fromToken.chainId === preset.from.chainId
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setFromToken(preset.from)
                setToToken(ETH_ROBINHOOD)
              }}
              className={
                active
                  ? "rounded-full border border-primary bg-primary/15 px-3 py-1.5 text-[12px] font-medium text-primary"
                  : "rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              }
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-[0_0_60px_rgba(204,255,0,0.04)]">
        <SwapWidget
          wallet={adaptedWallet}
          fromToken={fromToken}
          setFromToken={(token) => {
            if (token) setFromToken(token)
          }}
          toToken={toToken}
          setToToken={(token) => {
            if (token) setToToken(token)
          }}
          supportedWalletVMs={["evm"]}
          popularChainIds={[robinhood.id, 1, 8453, 792703809, 42161, 10, 137]}
          onConnectWallet={() => openConnectModal?.()}
          multiWalletSupportEnabled={false}
        />
      </div>

      <p className="mt-4 text-center text-[12px] leading-5 text-muted-foreground">
        Powered by Relay ·{" "}
        <Link href="/app" className="text-primary hover:underline">
          Fund a pool
        </Link>
        {" · "}
        <Link href="/docs/getting-started" className="text-primary hover:underline">
          Guide
        </Link>
      </p>
    </div>
  )
}
