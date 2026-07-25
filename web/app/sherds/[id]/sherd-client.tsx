"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useAccount } from "wagmi"
import { ExternalLink } from "lucide-react"
import type { SherdShareData } from "@/lib/share-data"
import { PotNftCard } from "@/components/cards/pot-nft-card"
import { CardStateBadge } from "@/components/cards/card-state-badge"
import { SherdRevealTrigger } from "@/components/reveal/sherd-reveal"
import { ShareButton } from "@/components/share/share-button"
import { OpenSeaLink } from "@/components/share/opensea-link"
import { ListForSale } from "@/components/market/list-for-sale"
import { OfferDialog } from "@/components/profile/offer-dialog"
import { StockLogoStack } from "@/components/stocks/stock-logo"
import { Button, buttonVariants } from "@/components/ui/button"
import { WalletButton } from "@/components/layout/wallet-button"
import { profilePath } from "@/lib/user-profile"
import { robinhood } from "@/lib/chain"
import { useOpenSeaListings } from "@/hooks/use-opensea-listings"
import { useClaimCard } from "@/hooks/use-claim-card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

type ActivityItem = {
  text: string
  amountFmt?: string
  blockNumber?: string
}

export function SherdShareClient({ sherd }: { sherd: SherdShareData }) {
  const reduceMotion = useReducedMotion() ?? false
  const { address } = useAccount()
  const { claim, isPending: claimPending } = useClaimCard()
  const { byTokenId: openSeaListing } = useOpenSeaListings(true)
  const osListing = openSeaListing(sherd.tokenId)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [claimedLocal, setClaimedLocal] = useState(sherd.claimed)
  const [offerOpen, setOfferOpen] = useState(false)

  const explorer = robinhood.blockExplorers.default.url
  const hasOwner =
    sherd.owner &&
    sherd.owner !== "0x0000000000000000000000000000000000000000"
  const isOwner =
    Boolean(address && hasOwner && address.toLowerCase() === sherd.owner.toLowerCase())
  const ownerLabel = sherd.ownerName || (hasOwner ? shortAddr(sherd.owner) : "—")
  const ownerHref = sherd.ownerSlug
    ? profilePath({ name: sherd.ownerName || "", slug: sherd.ownerSlug })
    : hasOwner
      ? `${explorer}/address/${sherd.owner}`
      : null

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/api/sherds/${sherd.tokenId}/activity`)
        if (!res.ok) return
        const json = (await res.json()) as {
          items?: { text: string; atBlock?: string; priceFmt?: string }[]
        }
        if (!alive) return
        setActivity(
          (json.items ?? []).slice(0, 6).map((i) => ({
            text: i.text,
            blockNumber: i.atBlock,
            amountFmt: i.priceFmt,
          }))
        )
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [sherd.tokenId])

  const revealPayload = {
    tokenId: sherd.tokenId,
    rarityIndex: sherd.rarityIndex,
    ownershipPct: sherd.ownershipPct,
    potName: sherd.potName,
    holdings: sherd.holdings,
    depositFmt: sherd.depositFmt,
  }

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-md"
          style={{ backgroundImage: "url(/brand/sherhood-banner.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/88 to-black" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-36 pt-6 sm:pb-40 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href="/sherds" className="text-white/45 transition hover:text-white">
              ← Sherds
            </Link>
            <span className="text-white/20" aria-hidden>
              /
            </span>
            <Link
              href={`/pools/${sherd.pot}`}
              className="text-[#ccff00]/80 transition hover:text-[#ccff00] hover:underline"
            >
              {sherd.potName}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton
              path={sherd.pagePath}
              title={`Sherd #${sherd.tokenId}`}
              text={`${sherd.rarityLabel} · ${sherd.potName}`}
            />
            <OpenSeaLink tokenId={sherd.tokenId} compact />
          </div>
        </div>

        {/* NFT hero — visual first */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-8 flex max-w-sm flex-col items-center"
        >
          <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
            <div className="absolute -inset-6 rounded-[2rem] bg-[#ccff00]/10 blur-3xl" aria-hidden />
            <PotNftCard
              rarityIndex={sherd.rarityIndex}
              revealed={sherd.revealed}
              tokenId={BigInt(sherd.tokenId)}
              stockLabel={sherd.potName}
              ownershipPct={sherd.revealed ? sherd.ownershipPct : undefined}
              size="fill"
              interactive
              tilt
              className="relative drop-shadow-[0_24px_80px_rgba(204,255,0,0.12)]"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <CardStateBadge revealed={sherd.revealed} claimed={sherd.claimed} />
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80">
              {sherd.rarityLabel}
            </span>
            {sherd.revealed ? (
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs tabular-nums text-white/80">
                {sherd.ownershipPct}%
              </span>
            ) : null}
            {osListing ? (
              <span className="rounded-full border border-[#ccff00]/35 bg-[#ccff00]/10 px-3 py-1 text-xs text-[#ccff00]">
                For sale
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-center text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-tight text-white">
            #{sherd.tokenId}
          </h1>
          <p className="mt-1 text-center text-sm text-white/45">
            {sherd.potName}
            {ownerHref ? (
              <>
                {" · "}
                <a
                  href={ownerHref}
                  className="text-white/70 underline-offset-2 hover:text-[#ccff00] hover:underline"
                >
                  {ownerLabel}
                </a>
              </>
            ) : null}
          </p>

          {sherd.revealed ? (
            <div className="mt-5 w-full space-y-3">
              <SherdRevealTrigger
                autoOpenOnce={isOwner}
                mode={isOwner ? "owner" : "viewer"}
                size="lg"
                className="w-full border-[#ccff00]/40 bg-[#ccff00]/15 text-[#ccff00] hover:bg-[#ccff00]/20"
                sherd={revealPayload}
              />
              {isOwner && !claimedLocal ? (
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[#ccff00] font-semibold text-black hover:brightness-110"
                  disabled={claimPending}
                  onClick={async () => {
                    try {
                      await claim(sherd.pot, BigInt(sherd.tokenId))
                      setClaimedLocal(true)
                      toast.success("Portfolio claimed — Sherd burned")
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Claim failed")
                    }
                  }}
                >
                  {claimPending ? "Claiming…" : "Claim stocks · burn Sherd"}
                </Button>
              ) : null}
              {isOwner && claimedLocal ? (
                <p className="text-center text-xs text-white/40">Claimed — Sherd burned</p>
              ) : null}
            </div>
          ) : null}
        </motion.div>

        {/* Sale — list OR offer (offers work even when not listed) */}
        <div className="mx-auto mt-8 grid max-w-lg gap-3">
          {osListing ? (
            <a
              href={osListing.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ccff00]/35 bg-[#ccff00]/10 px-4 py-3 transition hover:border-[#ccff00]/55"
            >
              <div>
                <p className="text-sm font-semibold text-[#ccff00]">For sale</p>
                <p className="text-[11px] text-white/45">OpenSea · Seaport</p>
              </div>
              <p className="inline-flex items-center gap-1.5 text-lg font-bold tabular-nums text-white">
                {osListing.priceEth} {osListing.currency}
                <ExternalLink className="size-3.5 opacity-60" aria-hidden />
              </p>
            </a>
          ) : null}

          {isOwner && !osListing ? <ListForSale tokenId={BigInt(sherd.tokenId)} /> : null}
          {isOwner && osListing ? (
            <OpenSeaLink tokenId={sherd.tokenId} label="Manage on OpenSea" />
          ) : null}

          {hasOwner && !isOwner && !claimedLocal ? (
            address ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl border-[#ccff00]/35 text-[#ccff00] hover:bg-[#ccff00]/10"
                onClick={() => setOfferOpen(true)}
              >
                Make offer
                {!osListing ? " · not listed" : ""}
              </Button>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="mb-3 text-sm text-white/50">Connect to offer on this Sherd.</p>
                <WalletButton />
              </div>
            )
          ) : null}
        </div>

        {hasOwner ? (
          <OfferDialog
            open={offerOpen}
            onOpenChange={setOfferOpen}
            tokenId={BigInt(sherd.tokenId)}
            seller={sherd.owner}
            listPriceFmt={osListing ? `${osListing.priceEth} ${osListing.currency}` : undefined}
            sealed={!sherd.revealed}
          />
        ) : null}

        {/* Compact meta — visuals over essays */}
        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
          <Link
            href={`/pools/${sherd.pot}`}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-[#ccff00]/30"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Pool</p>
            <p className="mt-1 truncate text-sm font-medium text-white">{sherd.potName}</p>
          </Link>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
              {sherd.revealed ? "Ownership" : "Deposit · band"}
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-white">
              {sherd.revealed ? (
                `${sherd.ownershipPct}%`
              ) : (
                <>
                  ${sherd.depositFmt}
                  <span className="mt-0.5 block text-[11px] font-normal text-white/40">
                    Reveal lands ~0.5×–2× deposit share
                  </span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-[#ccff00]/30"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Trade</p>
            <p className="mt-1 text-sm font-medium text-white">Market →</p>
          </Link>
        </div>

        {sherd.revealed && sherd.assets.length > 0 ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Holdings</p>
              <StockLogoStack
                symbols={sherd.assets.map((a) => a.symbol)}
                size={24}
                max={5}
              />
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sherd.assets.map((a) => (
                <li
                  key={a.token}
                  className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">{a.symbol}</span>
                  <span className="mt-0.5 block text-xs tabular-nums text-white/45">
                    {a.amountFmt}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {activity.length > 0 ? (
          <section className="mx-auto mt-6 max-w-2xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Pulse
            </p>
            <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-black/40">
              {activity.map((item, i) => (
                <li
                  key={`${item.blockNumber}-${i}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/65"
                >
                  <span className="min-w-0 truncate">{item.text}</span>
                  {item.amountFmt ? (
                    <span className="shrink-0 tabular-nums text-white/40">${item.amountFmt}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
          <Link
            href={`/pools/${sherd.pot}?tab=claim`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Pool claim
          </Link>
          <Link href="/sherds" className={cn(buttonVariants({ variant: "outline" }))}>
            All Sherds
          </Link>
          <Link href="/marketplace" className={cn(buttonVariants())}>
            Market
          </Link>
        </div>
      </div>
    </div>
  )
}
