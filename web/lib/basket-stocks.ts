/** Canonical RH Stock Tokens — used for logos/labels after basket close, not at creation. */
export type BasketStock = {
  symbol: string
  address: `0x${string}`
  name: string
  /** Uniswap fee tier hint */
  poolFee: number
}

export const BASKET_STOCKS: BasketStock[] = [
  { symbol: "AAPL", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", name: "Apple", poolFee: 500 },
  { symbol: "AMD", address: "0x86923f96303D656E4aa86D9d42D1e57ad2023fdC", name: "AMD", poolFee: 500 },
  { symbol: "AMZN", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", name: "Amazon", poolFee: 500 },
  { symbol: "BABA", address: "0xad25Ac6C84D497db898fa1E8387bf6Af3532a1c4", name: "Alibaba", poolFee: 500 },
  { symbol: "BE", address: "0x822CC93fFD030293E9842c30BBD678F530701867", name: "Bloom Energy", poolFee: 500 },
  { symbol: "COIN", address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b", name: "Coinbase", poolFee: 500 },
  { symbol: "CRCL", address: "0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5", name: "Circle", poolFee: 500 },
  { symbol: "CRWV", address: "0x5f10A1C971B69e47e059e1dC91901B59b3fB49C3", name: "CoreWeave", poolFee: 500 },
  { symbol: "GOOGL", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", name: "Alphabet", poolFee: 500 },
  { symbol: "INTC", address: "0xc72b96e0E48ecd4DC75E1e45396e26300BC39681", name: "Intel", poolFee: 500 },
  { symbol: "META", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", name: "Meta", poolFee: 500 },
  { symbol: "MSFT", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", name: "Microsoft", poolFee: 500 },
  { symbol: "MU", address: "0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD", name: "Micron", poolFee: 500 },
  { symbol: "NVDA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", name: "NVIDIA", poolFee: 500 },
  { symbol: "ORCL", address: "0xb0992820E760d836549ba69BC7598b4af75dEE03", name: "Oracle", poolFee: 500 },
  { symbol: "PLTR", address: "0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A", name: "Palantir", poolFee: 500 },
  { symbol: "QQQ", address: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68", name: "Invesco QQQ", poolFee: 500 },
  { symbol: "SGOV", address: "0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5", name: "0-3mo Treasury ETF", poolFee: 500 },
  { symbol: "SLV", address: "0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f", name: "Silver Trust", poolFee: 500 },
  { symbol: "SNDK", address: "0xB90A19fF0Af67f7779afF50A882A9CfF42446400", name: "Sandisk", poolFee: 500 },
  { symbol: "SPCX", address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", name: "SpaceX", poolFee: 500 },
  { symbol: "SPY", address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", name: "S&P 500 ETF", poolFee: 500 },
  { symbol: "TSLA", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", name: "Tesla", poolFee: 500 },
  { symbol: "USAR", address: "0xd917B029C761D264c6A312BBbcDA868658eF86a6", name: "USA Rare Earth", poolFee: 500 },
  { symbol: "USO", address: "0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344", name: "US Oil Fund", poolFee: 500 },
]

const STOCK_BY_ADDRESS = Object.fromEntries(
  BASKET_STOCKS.map((s) => [s.address.toLowerCase(), s])
)

const STOCK_BY_SYMBOL = Object.fromEntries(BASKET_STOCKS.map((s) => [s.symbol, s]))

/** Local bundled logos (primary) — CDN fallback in StockLogo if missing. */
export function stockLogoUrl(symbol: string, preferLocal = true): string {
  const sym = symbol.toUpperCase()
  if (preferLocal) return `/stocks/${sym}.png`
  return `https://assets.parqet.com/logos/symbol/${sym}`
}

export function stockLogoFallbackUrl(symbol: string): string {
  return `https://financialmodelingprep.com/image-stock/${symbol.toUpperCase()}.png`
}

export function stockByAddress(address: string): BasketStock | undefined {
  return STOCK_BY_ADDRESS[address.toLowerCase()]
}

export function stockBySymbol(symbol: string): BasketStock | undefined {
  return STOCK_BY_SYMBOL[symbol.toUpperCase()]
}

/** Protocol-owned defaults — creators never set these in the UI */
export const PROTOCOL_DEFAULTS = {
  entryFeeUsdg: "0",
  /** 0 → factory uses defaultProtocolFeeBps (1%) */
  protocolFeeBps: "0",
  /** AssetManager picks 2–5 stocks when basket closes */
  minStocks: 2,
  maxStocks: 5,
  defaultStocks: 3,
} as const
