"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  BASKET_STOCKS,
  stockByAddress,
  stockBySymbol,
  stockLogoFallbackUrl,
  stockLogoUrl,
} from "@/lib/basket-stocks"
import { StockPriceChart } from "@/components/stocks/stock-price-chart"

type StockLogoProps = {
  symbol?: string
  address?: string
  size?: number
  className?: string
  showSymbol?: boolean
}

export function StockLogo({
  symbol,
  address,
  size = 36,
  className,
  showSymbol = false,
}: StockLogoProps) {
  const stock =
    (symbol ? stockBySymbol(symbol) : undefined) ||
    (address ? stockByAddress(address) : undefined)
  const sym = stock?.symbol ?? symbol?.toUpperCase() ?? "?"
  const isShrh = sym === "SHRH"
  const [srcIndex, setSrcIndex] = useState(0)

  const sources = isShrh
    ? ["/brand-lockup-hood.png"]
    : sym !== "?"
      ? [stockLogoUrl(sym, true), stockLogoUrl(sym, false), stockLogoFallbackUrl(sym)]
      : []

  const src = sources[srcIndex]
  const failed = !src || srcIndex >= sources.length

  const onError = () => {
    if (srcIndex + 1 < sources.length) setSrcIndex((i) => i + 1)
    else setSrcIndex(sources.length)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#111]"
        style={{ width: size, height: size }}
      >
        {!failed ? (
          <Image
            src={src}
            alt={`${sym} logo`}
            width={size}
            height={size}
            className={cn(
              "h-full w-full object-cover",
              isShrh && "bg-sherhood p-1.5 object-contain"
            )}
            onError={onError}
            unoptimized={!src.startsWith("/")}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-bold text-sherhood"
            style={{ fontSize: Math.max(9, size * 0.28) }}
          >
            {sym.slice(0, 3)}
          </span>
        )}
      </div>
      {showSymbol && (
        <span className="text-sm font-semibold text-white/85">{sym}</span>
      )}
    </div>
  )
}

type StockLogoStackProps = {
  symbols?: string[]
  addresses?: string[]
  size?: number
  max?: number
  className?: string
}

export function StockLogoStack({
  symbols,
  addresses,
  size = 28,
  max = 5,
  className,
}: StockLogoStackProps) {
  const items = symbols?.length
    ? symbols.slice(0, max)
    : (addresses ?? [])
        .map((a) => stockByAddress(a)?.symbol)
        .filter(Boolean)
        .slice(0, max) as string[]

  if (items.length === 0) return null

  return (
    <div className={cn("flex items-center", className)}>
      {items.map((sym, i) => (
        <div
          key={sym}
          className="relative rounded-full ring-2 ring-black"
          style={{ marginLeft: i === 0 ? 0 : -size * 0.35, zIndex: items.length - i }}
        >
          <StockLogo symbol={sym} size={size} />
        </div>
      ))}
      {((symbols?.length ?? addresses?.length ?? 0) > max) && (
        <span className="ml-2 text-[10px] font-semibold text-white/35">
          +{((symbols?.length ?? addresses?.length ?? 0) - max)}
        </span>
      )}
    </div>
  )
}

type StockRegistryGridProps = {
  max?: number
  className?: string
}

/** Shows RH stock tokens available for protocol luck picks (not user-selected at create). */
export function StockRegistryGrid({ max = 20, className }: StockRegistryGridProps) {
  const stocks = BASKET_STOCKS.slice(0, max)

  return (
    <div className={cn("grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {stocks.map((s) => (
        <div
          key={s.symbol}
          className="glass-panel flex flex-col gap-2 rounded-[14px] px-3 py-2.5"
          title={s.name}
        >
          <div className="flex items-center justify-between gap-3">
            <StockLogo symbol={s.symbol} size={28} showSymbol className="min-w-0 shrink-0" />
            <StockPriceChart symbol={s.symbol} height={26} className="shrink" />
          </div>
        </div>
      ))}
    </div>
  )
}
