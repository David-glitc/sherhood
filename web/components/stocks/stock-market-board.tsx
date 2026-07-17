"use client"

import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { StockLogo } from "@/components/stocks/stock-logo"
import { StockPriceChart } from "@/components/stocks/stock-price-chart"
import { cn } from "@/lib/utils"

type StockMarketBoardProps = {
  max?: number
  className?: string
}

/** RH stock tokens with live underlying equity sparklines (5d). */
export function StockMarketBoard({ max = 12, className }: StockMarketBoardProps) {
  const stocks = BASKET_STOCKS.slice(0, max)

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            RH stock tokens
          </p>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Live prices</h3>
        </div>
        <p className="text-xs text-muted-foreground">5-day chart · underlying NYSE/Nasdaq</p>
      </div>

      <div className="responsive-grid">
        {stocks.map((s) => (
          <div
            key={s.symbol}
            className="product-surface-subtle flex min-w-0 items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <StockLogo symbol={s.symbol} size={34} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{s.symbol}</p>
                <p className="truncate text-xs text-muted-foreground">{s.name}</p>
              </div>
            </div>
            <StockPriceChart symbol={s.symbol} height={32} />
          </div>
        ))}
      </div>
    </section>
  )
}
