import Link from "next/link"
import { PotDiscovery } from "@/components/pots/pot-discovery"
import { StockMarketBoard } from "@/components/stocks/stock-market-board"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { ProtocolStats } from "@/components/protocol/protocol-stats"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { loadProtocolStats } from "@/lib/protocol-stats-data"

export const dynamic = "force-dynamic"

export default async function AppPage() {
  const initialStats = await loadProtocolStats()

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="Robinhood Chain"
        title="Sherd pools"
        actions={
          <>
            <Link
              href="/create"
              className={cn(buttonVariants({ size: "lg" }), "min-w-32")}
            >
              Create
            </Link>
            <Link
              href="/inventory"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Cards
            </Link>
          </>
        }
      />

      <ProtocolStats initial={initialStats} />

      <section className="product-section" aria-labelledby="pools-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 id="pools-heading" className="text-2xl font-semibold sm:text-3xl">
            Pools
          </h2>
          <Link href="/create" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Create
          </Link>
        </div>
        <PotDiscovery />
      </section>

      <section
        className="product-section border-t border-border pt-8 sm:pt-10"
        aria-labelledby="market-heading"
      >
        <h2 id="market-heading" className="mb-5 text-2xl font-semibold sm:text-3xl">
          Market
        </h2>
        <StockMarketBoard />
      </section>
    </PageShell>
  )
}
