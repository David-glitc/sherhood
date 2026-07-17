"use client"

import Link from "next/link"
import { PotDiscovery } from "@/components/pots/pot-discovery"
import { StockMarketBoard } from "@/components/stocks/stock-market-board"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { ProtocolStats } from "@/components/protocol/protocol-stats"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AppPage() {
  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Robinhood Chain · 4663"
        title="Stock baskets"
        description="Fund an open basket with USDG, ETH, or WETH. Every deposit mints a card that reveals your share when the basket closes."
        actions={
          <>
          <Link
            href="/create"
            className={cn(buttonVariants({ size: "lg" }), "min-w-32")}
          >
            Create basket
          </Link>
          <Link
            href="/inventory"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            View cards
          </Link>
          <Link
            href="/docs/getting-started"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            Read guide
          </Link>
          </>
        }
      />

      <ProtocolStats />

      <section className="product-section" aria-labelledby="open-baskets-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="open-baskets-heading" className="text-2xl font-semibold sm:text-3xl">
              Open baskets
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a funding window and review its goal before depositing.
            </p>
          </div>
          <Link href="/create" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Create basket
          </Link>
        </div>
        <PotDiscovery />
      </section>

      <section className="product-section border-t border-border pt-8 sm:pt-10" aria-labelledby="market-heading">
        <div className="mb-5">
          <h2 id="market-heading" className="text-2xl font-semibold sm:text-3xl">
            Market reference
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current stock pricing for basket constituents.
          </p>
        </div>
        <StockMarketBoard />
      </section>
    </PageShell>
  )
}
