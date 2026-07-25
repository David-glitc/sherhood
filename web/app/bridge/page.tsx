import type { Metadata } from "next"
import { BridgeWidget } from "@/components/bridge/bridge-widget"
import { PageHeader, PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Bridge — Sherhood",
  description:
    "Bridge any Relay-supported chain into Robinhood Chain. Fund Sherhood pools with ETH, WETH, or USDG.",
}

export default function BridgePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Bridge"
        title="Into Robinhood Chain"
        description="Relay connects every supported chain. We prioritize Ethereum, Base, and Solana as sources — destination defaults to Robinhood so you can fund pools right away."
      />
      <BridgeWidget />
    </PageShell>
  )
}
