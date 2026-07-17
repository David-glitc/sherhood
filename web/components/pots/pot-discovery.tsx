"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { potFactoryConfig, potAbi, entryRouterConfig } from "@/lib/contracts"
import { useDepositPot, type PayAsset } from "@/hooks/use-deposit-pot"
import {
  POT_STATUSES,
  deadlineLabel,
  fmtTokenAmount,
  fmtUsdg,
  holdingsLabel,
  parseHoldings,
  type PotView,
} from "@/hooks/use-pots"
import { BASKET_STOCKS } from "@/lib/basket-stocks"
import { Button } from "@/components/ui/button"
import { MintRevealModal } from "@/components/cards/mint-reveal-modal"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { StockPriceChart } from "@/components/stocks/stock-price-chart"
import { UsdgLogo } from "@/components/tokens/usdg-logo"
import { ShrhLuckPill } from "@/components/layout/shrh-luck-pill"
import { useEthUsd } from "@/hooks/use-eth-usd"
import {
  SlippageControl,
  DEFAULT_SLIPPAGE_PCT,
  minUsdgOutFor,
} from "@/components/pots/slippage-control"
import Link from "next/link"

function usePotAddresses() {
  const { data, isLoading } = useReadContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
  })
  return {
    pots: (data as `0x${string}`[] | undefined) ?? [],
    isLoading,
  }
}

function usePotView(address: `0x${string}`): PotView | null {
  const { data } = useReadContracts({
    contracts: [
      { address, abi: potAbi, functionName: "fundingGoal" },
      { address, abi: potAbi, functionName: "deadline" },
      { address, abi: potAbi, functionName: "minDeposit" },
      { address, abi: potAbi, functionName: "entryFee" },
      { address, abi: potAbi, functionName: "status" },
      { address, abi: potAbi, functionName: "totalDeposited" },
      { address, abi: potAbi, functionName: "participantCount" },
      { address, abi: potAbi, functionName: "fundingProgressBps" },
      { address, abi: potAbi, functionName: "getHoldings" },
    ],
  })

  return useMemo(() => {
    if (!data || data.some((r) => r.status !== "success")) return null
    const holdingsRaw = data[8].result as [string[], bigint[]] | undefined
    const holdings = parseHoldings(
      holdingsRaw?.[0] as `0x${string}`[] | undefined,
      holdingsRaw?.[1]
    )
    return {
      address,
      fundingGoal: data[0].result as bigint,
      deadline: data[1].result as bigint,
      minDeposit: data[2].result as bigint,
      entryFee: data[3].result as bigint,
      status: Number(data[4].result),
      totalDeposited: data[5].result as bigint,
      participantCount: data[6].result as bigint,
      progressBps: data[7].result as bigint,
      holdings,
    }
  }, [address, data])
}

function PotCardUi({
  address,
  isConnected,
  onMinted,
}: {
  address: `0x${string}`
  isConnected: boolean
  onMinted: (tokenId: bigint | undefined, stockLabel: string) => void
}) {
  const pot = usePotView(address)
  const { deposit, parseDepositAmount, isPending, onRobinhood } = useDepositPot()
  const { ethUsd, usdOfEth } = useEthUsd()
  const [amountStr, setAmountStr] = useState("")
  const [payWith, setPayWith] = useState<PayAsset>("ETH")
  const [slippagePct, setSlippagePct] = useState<number>(DEFAULT_SLIPPAGE_PCT)

  if (!pot) {
    return (
      <div className="h-72 animate-pulse rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02]" />
    )
  }

  const status = POT_STATUSES[pot.status] ?? "Unknown"
  const isFunding = pot.status === 0
  const progress = Math.min(100, Number(pot.progressBps) / 100)
  const min = Number(pot.minDeposit) / 1e18
  const routerReady =
    entryRouterConfig.address !== "0x0000000000000000000000000000000000000000"

  const label = holdingsLabel(pot.holdings)
  const previewSymbols = BASKET_STOCKS.slice(0, 4).map((s) => s.symbol)
  const displaySymbols =
    pot.holdings.length > 0
      ? pot.holdings.map((h) => h.symbol)
      : previewSymbols

  const amountNum = Number(amountStr)
  const usdHint =
    payWith !== "USDG" && Number.isFinite(amountNum) && amountNum > 0
      ? usdOfEth(amountNum)
      : payWith === "USDG" && Number.isFinite(amountNum) && amountNum > 0
        ? amountNum
        : null

  const onDeposit = async () => {
    if (!amountStr) return
    if (payWith === "USDG") {
      const parsed = Number(amountStr)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      const amount = parseDepositAmount(parsed)
      const { tokenId } = await deposit(pot.address, amount, pot.entryFee, "USDG")
      onMinted(tokenId, label)
    } else {
      const minOut = minUsdgOutFor(usdHint, slippagePct)
      const { tokenId } = await deposit(pot.address, 0n, pot.entryFee, payWith, amountStr, minOut)
      onMinted(tokenId, label)
    }
    setAmountStr("")
  }

  return (
    <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#070707] p-6 transition duration-300 hover:border-sherhood/35">
      <div className="relative mb-4 flex items-center justify-between">
        <StockLogoStack symbols={displaySymbols} size={30} max={4} />
        <span
          className={`text-xs font-semibold ${
            isFunding ? "text-sherhood" : pot.status === 3 ? "text-amber-300" : "text-white/35"
          }`}
        >
          {status}
        </span>
      </div>

      <h3 className="text-[22px] font-bold tracking-tight text-white">
        <Link href={`/basket/${address}`} className="hover:text-sherhood">
          {pot.holdings.length > 0 ? label : "Multi-stock basket"}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-white/35">
        {isFunding
          ? "Stocks picked when basket fills · mint a mystery card"
          : "Fractional ownership across picked stocks"}
      </p>
      <Link
        href={`/basket/${address}`}
        className="mt-2 inline-block font-mono text-[11px] text-white/30 hover:text-sherhood"
      >
        {address.slice(0, 8)}…{address.slice(-6)} · details
      </Link>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wider text-white/35">
          <span>
          <span className="inline-flex items-center gap-1">
            {fmtUsdg(pot.totalDeposited)} / {fmtUsdg(pot.fundingGoal)}{" "}
            <UsdgLogo size={14} />
          </span>
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-white/[0.06]"
          role="progressbar"
          aria-label="Basket funding progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-sherhood transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Min</p>
          <p className="mt-1 text-sm font-semibold text-white/85">{fmtUsdg(pot.minDeposit)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30">People</p>
          <p className="mt-1 text-sm font-semibold text-white/85">{Number(pot.participantCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Ends</p>
          <p className="mt-1 text-sm font-semibold text-white/85">{deadlineLabel(pot.deadline)}</p>
        </div>
      </div>

      {isFunding && (
        <div className="mt-6 space-y-3">
          <div className="flex gap-1 rounded-full border border-white/[0.08] bg-black p-1">
            {(["ETH", "WETH", "USDG"] as PayAsset[]).map((asset) => {
              const disabled = asset !== "USDG" && !routerReady
              return (
                <button
                  key={asset}
                  type="button"
                  disabled={disabled}
                  aria-pressed={payWith === asset}
                  onClick={() => setPayWith(asset)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-bold transition ${
                    payWith === asset
                      ? "bg-sherhood text-black"
                      : "text-white/40 hover:text-white/70 disabled:opacity-25"
                  }`}
                >
                  {asset === "USDG" ? <UsdgLogo size={14} /> : null}
                  {asset}
                </button>
              )
            })}
          </div>

          {payWith === "ETH" && (
            <div className="flex gap-2">
              {["0.01", "0.1", "1"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAmountStr(chip)}
                  className="flex-1 rounded-full border border-white/[0.08] py-2 text-xs font-semibold text-white/55 transition hover:border-sherhood/40 hover:text-sherhood"
                >
                  +{chip}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr("0.05")}
                className="flex-1 rounded-full border border-white/[0.08] py-2 text-xs font-semibold text-white/55 transition hover:border-sherhood/40 hover:text-sherhood"
              >
                0.05
              </button>
            </div>
          )}

          <input
            type="number"
            min={payWith === "USDG" ? min : 0}
            step="any"
            placeholder={payWith === "USDG" ? `USDG (min ${min})` : `${payWith} amount`}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full rounded-full border border-white/[0.1] bg-black px-5 py-3 text-center text-2xl font-semibold text-white outline-none focus:border-sherhood"
          />

          <p className="text-center text-xs text-white/35">
            {usdHint != null
              ? `≈ $${usdHint.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`
              : ethUsd
                ? `Live ETH $${ethUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : "Enter an amount"}
            {payWith !== "USDG" && " · swaps to USDG via Uniswap V3"}
          </p>

          {payWith !== "USDG" && (
            <>
              <SlippageControl value={slippagePct} onChange={setSlippagePct} disabled={isPending} />
              <p className="text-center text-[11px] text-white/30">
                {usdHint != null
                  ? `Reverts below $${(usdHint * (1 - slippagePct / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG out`
                  : "No live ETH price — swap runs without a minimum"}
              </p>
            </>
          )}

          <Button
            className="h-12 w-full rounded-[14px] bg-sherhood text-sm font-semibold text-black hover:brightness-110"
            onClick={onDeposit}
            disabled={!isConnected || isPending || !amountStr || !onRobinhood}
          >
            {!isConnected
              ? "Connect"
              : !onRobinhood
                ? "Switch to Robinhood Chain"
                : isPending
                  ? "Funding…"
                  : `Fund with ${payWith}`}
          </Button>
        </div>
      )}

      {pot.status >= 2 && pot.holdings.length > 0 && (
        <div className="mt-4 space-y-2 rounded-[1rem] border border-sherhood/25 bg-sherhood/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sherhood/80">
            Holdings
          </p>
          {pot.holdings.map((h) => (
            <div key={h.token} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <StockLogoStack symbols={[h.symbol]} size={22} max={1} />
                <StockPriceChart symbol={h.symbol} height={24} showPrice={false} />
              </div>
              <span className="font-semibold text-white/70">
                {fmtTokenAmount(h.amount)} {h.symbol}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEMO_BASKETS = [
  { symbols: ["NVDA", "AAPL", "MSFT"], progress: 72, people: 18, goal: "100,000" },
  { symbols: ["SPY", "QQQ", "GOOGL"], progress: 41, people: 9, goal: "50,000" },
  { symbols: ["TSLA", "META", "AMD", "COIN"], progress: 88, people: 34, goal: "200,000" },
]

export function PotDiscovery() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const { pots, isLoading } = usePotAddresses()
  const [mintOpen, setMintOpen] = useState(false)
  const [mintTokenId, setMintTokenId] = useState<bigint | undefined>()
  const [mintStock, setMintStock] = useState<string | undefined>()
  const zeroFactory =
    potFactoryConfig.address === "0x0000000000000000000000000000000000000000"

  const handleMinted = (tokenId: bigint | undefined, stockLabel: string) => {
    setMintTokenId(tokenId)
    setMintStock(stockLabel)
    setMintOpen(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-white/40">
          Baskets buy 2–5 RH stocks when they fill. Stocks are not locked at creation.
        </p>
        <ShrhLuckPill />
      </div>

      <MintRevealModal
        open={mintOpen}
        tokenId={mintTokenId}
        stockLabel={mintStock}
        onClose={() => setMintOpen(false)}
        onViewInventory={() => {
          setMintOpen(false)
          router.push("/inventory")
        }}
      />

      {zeroFactory && (
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-sherhood/20 bg-sherhood/[0.04] px-5 py-4 text-center text-sm text-sherhood/90">
            Contracts not live on this build yet — preview below. Local smokes run on anvil only.
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_BASKETS.map((b) => (
              <div
                key={b.symbols.join("-")}
                className="rounded-[1.5rem] border border-white/[0.08] bg-[#070707] p-6"
              >
                <StockLogoStack symbols={b.symbols} size={32} max={4} className="mb-4" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Preview · multi-stock
                </p>
                <h3 className="mt-3 text-[22px] font-bold tracking-tight">
                  {b.symbols.slice(0, 2).join(" + ")}
                  {b.symbols.length > 2 ? ` +${b.symbols.length - 2}` : ""}
                </h3>
                <p className="mt-1 text-sm text-white/35">Stocks picked at close</p>
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-[11px] text-white/35">
                    <span>Goal {b.goal} USDG</span>
                    <span>{b.progress}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-sherhood"
                      style={{ width: `${b.progress}%` }}
                    />
                  </div>
                </div>
                <p className="mt-5 text-center text-xs text-white/30">{b.people} funded</p>
                <Link
                  href="/"
                  className="mt-4 flex h-11 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white/50"
                >
                  Waiting for deploy
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && pots.length === 0 && !zeroFactory && (
        <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#070707] p-12 text-center">
          <h2 className="text-xl font-semibold text-white/80">No open baskets</h2>
          <p className="mt-2 text-sm text-white/40">New baskets show up here when they open.</p>
          <Link href="/create" className="mt-5 inline-block text-sm font-semibold text-sherhood">
            Create one →
          </Link>
        </div>
      )}

      {isLoading && !zeroFactory && (
        <div className="flex items-center justify-center py-20 text-sm text-white/40">
          Loading baskets…
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pots.map((addr) => (
          <PotCardUi
            key={addr}
            address={addr}
            isConnected={isConnected}
            onMinted={handleMinted}
          />
        ))}
      </div>
    </div>
  )
}
