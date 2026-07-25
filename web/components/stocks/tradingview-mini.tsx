"use client"

import { useEffect, useId, useRef, useState } from "react"
import { tradingViewChartUrl } from "@/lib/stock-links"
import { cn } from "@/lib/utils"

/** Single TradingView mini — forced dark, fixed height (no CLS / light flash). */
export function TradingViewMini({
  symbol,
  height = 160,
  className,
}: {
  symbol: string
  height?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const uid = useId().replace(/:/g, "")

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ""

    const widget = document.createElement("div")
    widget.className = "tradingview-widget-container__widget"
    widget.style.height = `${height}px`
    widget.style.width = "100%"
    el.appendChild(widget)

    const script = document.createElement("script")
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: symbol.toUpperCase(),
      width: "100%",
      height,
      locale: "en",
      dateRange: "1M",
      colorTheme: "dark",
      isTransparent: false,
      autosize: false,
      largeChartUrl: tradingViewChartUrl(symbol),
      chartOnly: false,
      noTimeScale: false,
    })
    el.appendChild(script)

    return () => {
      el.innerHTML = ""
    }
  }, [symbol, height, uid])

  return (
    <div
      className={cn(
        "tv-sherhood overflow-hidden rounded-xl border border-[#222] bg-[#050806]",
        className
      )}
      style={{ height, minHeight: height, maxHeight: height }}
    >
      <div
        className="tradingview-widget-container h-full w-full bg-[#050806]"
        ref={ref}
        style={{ height }}
      />
    </div>
  )
}

/** Tabbed minis so every holding gets a dark chart without stacking CLS. */
export function TradingViewSymbolTabs({
  symbols,
  height = 150,
  className,
}: {
  symbols: string[]
  height?: number
  className?: string
}) {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean)))
  const [active, setActive] = useState(unique[0] ?? "")

  useEffect(() => {
    if (unique.length && !unique.includes(active)) setActive(unique[0]!)
  }, [unique, active])

  if (unique.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {unique.length > 1 ? (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Chart symbol">
          {unique.map((sym) => (
            <button
              key={sym}
              type="button"
              role="tab"
              aria-selected={active === sym}
              onClick={() => setActive(sym)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
                active === sym
                  ? "bg-[#ccff00] text-black"
                  : "bg-white/5 text-white/50 hover:text-white/80"
              )}
            >
              {sym}
            </button>
          ))}
        </div>
      ) : null}
      <TradingViewMini symbol={active || unique[0]!} height={height} />
    </div>
  )
}
