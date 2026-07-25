"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useWalletClient } from "wagmi"
import { adaptViemWallet } from "@relayprotocol/relay-sdk"
import type { Token } from "@relayprotocol/relay-kit-ui"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { ShrhBuyWidget } from "@/components/tokens/shrh-buy-widget"
import { SHRH_ADDRESS, SHRH_ENABLED, SHRH_SYMBOL } from "@/lib/protocol"
import { robinhood } from "@/lib/chain"

const SwapWidget = dynamic(
  () => import("@relayprotocol/relay-kit-ui").then((m) => m.SwapWidget),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0a] text-sm text-white/45">
        Loading swap…
      </div>
    ),
  }
)

const ETH_ROBINHOOD: Token = {
  chainId: robinhood.id,
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  name: "Ether",
  symbol: "ETH",
  logoURI: "https://assets.relay.link/icons/1/light.png",
}

export default function BuyShrdPage() {
  const { openConnectModal } = useConnectModal()
  const { data: walletClient } = useWalletClient()

  const adaptedWallet = useMemo(() => {
    if (!walletClient) return undefined
    try {
      return adaptViemWallet(walletClient)
    } catch {
      return undefined
    }
  }, [walletClient])

  const [fromToken, setFromToken] = useState<Token>(ETH_ROBINHOOD)
  const [toToken, setToToken] = useState<Token>({
    chainId: robinhood.id,
    address: SHRH_ADDRESS,
    decimals: 18,
    name: "Sherhood",
    symbol: SHRH_SYMBOL,
    logoURI: "/brand-lockup-hood.png",
  })

  return (
    <PageShell narrow>
      <PageHeader
        eyebrow="Buy $SHERD"
        title="Get $SHERD"
        description="Swap ETH for $SHERD on Robinhood Chain — luck weight for basket entries."
        actions={
          <Link
            href="/app"
            className="rounded-[14px] border border-[#333333] bg-transparent px-4 py-3 text-sm font-semibold text-[#9e9e9e] hover:border-primary/40 hover:text-[#e5e7eb]"
          >
            Back to pools
          </Link>
        }
      />

      {!SHRH_ENABLED ? (
        <div className="mx-auto w-full max-w-md">
          <ShrhBuyWidget />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] p-1 shadow-[0_0_48px_rgba(204,255,0,0.05)]">
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
              popularChainIds={[robinhood.id, 1, 8453]}
              onConnectWallet={() => openConnectModal?.()}
              multiWalletSupportEnabled={false}
            />
          </div>
          <ShrhBuyWidget compact />
        </div>
      )}
    </PageShell>
  )
}
