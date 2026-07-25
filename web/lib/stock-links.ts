/** External chart deep-links for RH stock / ETF symbols. */
export function tradingViewChartUrl(symbol: string): string {
  const sym = symbol.trim().toUpperCase()
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`
}

export function tradingViewSymbolUrl(symbol: string): string {
  const sym = symbol.trim().toUpperCase()
  return `https://www.tradingview.com/symbols/${encodeURIComponent(sym)}/`
}
