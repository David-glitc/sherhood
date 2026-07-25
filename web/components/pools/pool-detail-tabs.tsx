"use client"

import Link from "next/link"
import { toast } from "sonner"
import type { ReactNode } from "react"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { ClaimableStockRow } from "@/components/stocks/claimable-stock-row"
import { Button } from "@/components/ui/button"
import { UserChip } from "@/components/profile/user-chip"
import { useStockPrices } from "@/hooks/use-stock-prices"
import {
  RARITIES,
  effectiveRarityIndex,
  fmtUsdg,
  ownershipPct,
  type PotHolding,
} from "@/hooks/use-pots"
import { cn } from "@/lib/utils"

const OWNERSHIP_ONE = 10n ** 18n

export type PoolSherdRow = {
  tokenId: bigint
  owner?: `0x${string}`
  card: {
    depositAmount: bigint
    ownershipWeight: bigint
    rarity: number
    revealed: boolean
    claimed: boolean
  } | null
}

type ProfileLookup = (address: string) =>
  | { name?: string; avatarId?: number }
  | null
  | undefined

type PoolDetailTabsProps = {
  tab: "overview" | "sherds" | "claim"
  onTabChange: (tab: "overview" | "sherds" | "claim") => void
  deposits: PoolSherdRow[]
  myDeposits: PoolSherdRow[]
  holdings: PotHolding[]
  potStatus: number
  wallet?: `0x${string}`
  getProfile: ProfileLookup
  claimPending: boolean
  onClaim: (tokenId: bigint) => Promise<void>
  overview: ReactNode
}

const TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "sherds" as const, label: "Sherds" },
  { id: "claim" as const, label: "Claim" },
]

export function PoolDetailTabs({
  tab,
  onTabChange,
  deposits,
  myDeposits,
  holdings,
  potStatus,
  wallet,
  getProfile,
  claimPending,
  onClaim,
  overview,
}: PoolDetailTabsProps) {
  const claimable = myDeposits.filter(
    (d) => d.card?.revealed && !d.card.claimed && potStatus === 3
  )
  const symbols = holdings.map((h) => h.symbol)
  const { quotes } = useStockPrices(tab === "claim" || potStatus === 3 ? symbols : [])

  return (
    <div>
      <div
        role="tablist"
        aria-label="Pool sections"
        className="flex gap-1 rounded-[14px] border border-[#222222] bg-black/50 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold transition",
              tab === t.id
                ? "bg-[#ccff00] text-black"
                : "text-white/45 hover:text-white/80"
            )}
          >
            {t.label}
            {t.id === "sherds" ? (
              <span className="ml-1 tabular-nums opacity-70">{deposits.length}</span>
            ) : null}
            {t.id === "claim" && claimable.length > 0 ? (
              <span className="ml-1 tabular-nums opacity-70">{claimable.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-5 sm:mt-6">
        {tab === "overview" ? overview : null}

        {tab === "sherds" ? (
          <div>
            <p className="text-[12px] tracking-[0.12em] text-[#666666]">
              ALL SHERDS ON THIS POOL
            </p>
            {deposits.length === 0 ? (
              <p className="mt-4 rounded-[14px] border border-dashed border-[#2a2a2a] px-4 py-10 text-center text-[14px] text-[#666666]">
                No Sherds yet.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {deposits.map(({ tokenId, owner, card: c }) => {
                  const rarityIdx = c
                    ? effectiveRarityIndex(c.revealed, c.rarity, c.ownershipWeight)
                    : 0
                  const p = owner ? getProfile(owner) : null
                  return (
                    <li key={tokenId.toString()}>
                      <Link
                        href={`/sherds/${tokenId.toString()}`}
                        className="group block rounded-[18px] border border-[#1f1f1f] bg-black/40 p-2.5 transition hover:border-[#ccff00]/35"
                      >
                        <PotNftCard
                          rarityIndex={rarityIdx}
                          revealed={Boolean(c?.revealed)}
                          tokenId={tokenId}
                          stockLabel={
                            c?.revealed
                              ? `${ownershipPct(c.ownershipWeight)}%`
                              : "Sealed"
                          }
                          ownershipPct={
                            c?.revealed ? ownershipPct(c.ownershipWeight) : undefined
                          }
                          size="fill"
                          className="aspect-[2/3] w-full"
                        />
                        <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                          <span className="font-mono text-[12px] text-[#ccff00]">
                            #{tokenId.toString()}
                          </span>
                          <CardStateBadge
                            revealed={Boolean(c?.revealed)}
                            claimed={Boolean(c?.claimed)}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                          {owner ? (
                            <UserChip
                              address={owner}
                              name={p?.name}
                              avatarId={p?.avatarId}
                              size={20}
                            />
                          ) : (
                            <span className="text-[11px] text-[#555]">—</span>
                          )}
                          <span className="text-[11px] tabular-nums text-white/45">
                            {c ? `$${fmtUsdg(c.depositAmount)}` : "—"}
                          </span>
                        </div>
                        {c?.revealed ? (
                          <p className="mt-1 px-0.5 text-[10px] text-white/35">
                            {RARITIES[rarityIdx]} · {ownershipPct(c.ownershipWeight)}%
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "claim" ? (
          <div className="space-y-4">
            <div className="rounded-[22px] border border-[#ccff00]/20 bg-[#0a0a0a] p-5 sm:p-6">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ccff00]/80">
                CLAIM PORTFOLIO
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/45">
                Claim sends your ownership share of each vault stock to your wallet and{" "}
                <span className="text-white/70">burns the Sherd</span>. This can’t be undone.
              </p>
            </div>

            {!wallet ? (
              <p className="rounded-[14px] border border-dashed border-[#2a2a2a] px-4 py-8 text-center text-[14px] text-[#666666]">
                Connect a wallet to claim.
              </p>
            ) : potStatus !== 3 ? (
              <p className="rounded-[14px] border border-dashed border-[#2a2a2a] px-4 py-8 text-center text-[14px] text-[#666666]">
                Claims open after the pool reveals.
              </p>
            ) : claimable.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-[#2a2a2a] px-4 py-8 text-center text-[14px] text-[#666666]">
                {myDeposits.some((d) => d.card?.claimed)
                  ? "You’ve claimed your Sherds on this pool."
                  : "No claimable Sherds in this wallet for this pool."}
              </p>
            ) : (
              claimable.map(({ tokenId, card: c }) => {
                if (!c) return null
                const share = c.ownershipWeight
                return (
                  <div
                    key={tokenId.toString()}
                    className="rounded-[22px] border border-[#333333] bg-[#0a0a0a] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link
                          href={`/sherds/${tokenId.toString()}`}
                          className="font-mono text-[15px] text-[#ccff00] hover:underline"
                        >
                          #{tokenId.toString()}
                        </Link>
                        <p className="mt-1 text-[13px] text-white/45">
                          {ownershipPct(share)}% of vault · deposit ${fmtUsdg(c.depositAmount)}
                        </p>
                      </div>
                      <CardStateBadge revealed claimed={false} />
                    </div>

                    {holdings.length > 0 ? (
                      <div className="mt-4 divide-y divide-white/[0.06] rounded-[14px] border border-white/5 bg-black/40 px-3">
                        {holdings.map((h) => {
                          const amountWei = (h.amount * share) / OWNERSHIP_ONE
                          const q = quotes[h.symbol.toUpperCase()]
                          return (
                            <ClaimableStockRow
                              key={h.token}
                              symbol={h.symbol}
                              amountWei={amountWei}
                              price={q?.price}
                              changePct={q?.changePct}
                            />
                          )
                        })}
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      className="mt-4 h-12 w-full rounded-[14px] bg-[#ccff00] font-semibold text-black hover:brightness-110"
                      disabled={claimPending}
                      onClick={async () => {
                        try {
                          await onClaim(tokenId)
                          toast.success("Portfolio claimed — Sherd burned")
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Claim failed")
                        }
                      }}
                    >
                      {claimPending
                        ? "Claiming…"
                        : "Claim stocks · burn Sherd"}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
