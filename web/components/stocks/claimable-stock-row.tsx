"use client"

import { StockLogo } from "@/components/stocks/stock-logo"
import { tradingViewChartUrl } from "@/lib/stock-links"
import { stockAmountToNumber } from "@/hooks/use-pots"
import { cn } from "@/lib/utils"

type ClaimableStockRowProps = {
  symbol: string
  amountWei: bigint
  price?: number
  changePct?: number
  className?: string
  showChartLink?: boolean
}

/** Amount · spot price · USD value for claimable / available stock. */
export function ClaimableStockRow({
  symbol,
  amountWei,
  price = 0,
  changePct,
  className,
  showChartLink = true,
}: ClaimableStockRowProps) {
  const amount = stockAmountToNumber(amountWei)
  const value = price > 0 ? amount * price : null
  const up = (changePct ?? 0) >= 0

  return (
    <div className={cn("flex items-center justify-between gap-3 py-2 text-sm", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <StockLogo symbol={symbol} size={24} />
        <div className="min-w-0">
          {showChartLink ? (
            <a
              href={tradingViewChartUrl(symbol)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-[#ccff00]"
              title={`${symbol} on TradingView`}
            >
              {symbol}
            </a>
          ) : (
            <span className="font-medium text-foreground">{symbol}</span>
          )}
          {price > 0 && (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {changePct != null && Number.isFinite(changePct) && (
                <span className={up ? " text-[#ccff00]" : " text-red-400"}>
                  {" "}
                  {up ? "+" : ""}
                  {changePct.toFixed(1)}%
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="tabular-nums text-foreground">
          {amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}
        </p>
        {value != null ? (
          <p className="text-[11px] tabular-nums text-[#ccff00]/90">
            ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">—</p>
        )}
      </div>
    </div>
  )
}
