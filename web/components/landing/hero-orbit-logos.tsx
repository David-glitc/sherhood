"use client"

import { StockLogo } from "@/components/stocks/stock-logo"

const orbitingStocks = [
  { symbol: "NVDA", position: "left-[2%] top-[18%]", delay: "0s" },
  { symbol: "AAPL", position: "right-[4%] top-[8%]", delay: "0.6s" },
  { symbol: "TSLA", position: "right-[1%] bottom-[15%]", delay: "1.2s" },
  { symbol: "MSFT", position: "left-[4%] bottom-[8%]", delay: "1.8s" },
]

/** Orbit logos — client-only, deferred so they do not compete with LCP. */
export function HeroOrbitLogos() {
  return (
    <>
      {orbitingStocks.map((stock) => (
        <div
          key={stock.symbol}
          className={`absolute z-20 hero-float ${stock.position}`}
          style={{ animationDelay: stock.delay }}
        >
          <div className="rounded-full border border-border bg-background/90 p-1.5 shadow-2xl shadow-black">
            <StockLogo symbol={stock.symbol} size={40} />
          </div>
        </div>
      ))}
    </>
  )
}
