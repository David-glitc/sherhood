"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { SHRH_SYMBOL } from "@/lib/protocol"

const usps = [
  {
    kicker: "01",
    title: "Ownership for everyone",
    body: "Every Sherd is a claim on the vault. Chance sets share size (~0.5×–2× deposit weight) — never a wipeout to zero.",
  },
  {
    kicker: "02",
    title: "Real Robinhood stock tokens",
    body: "When a pool seals, AssetManager buys 2–5 liquid RH stocks into the vault. Your card redeems that basket.",
  },
  {
    kicker: "03",
    title: "Instant Mint",
    body: "Bankroll a solo $1.50–$2 vault. Deployer opens it (no $5 create fee). Fund, buy, reveal in one flow.",
  },
  {
    kicker: "04",
    title: `$${SHRH_SYMBOL} unit of account`,
    body: "Quotes lean on $SHERD. Bring any token via swap — vault still settles to USDG for stock purchases.",
  },
  {
    kicker: "05",
    title: "Trade or claim",
    body: "Reveal unlocks ownership %. Claim stock shares or list the Sherd on OpenSea / in-app Trade.",
  },
  {
    kicker: "06",
    title: "Bridge in from anywhere",
    body: "Relay bridge lands ETH, Base, Solana, and more onto Robinhood Chain — then mint.",
  },
]

export function WhySection() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <section className="border-y border-border bg-card/30">
      <div className="page-container-wide py-20 sm:py-28">
        <div className="mb-12 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Why Sherhood
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            Collectible finance.
            <span className="block text-muted-foreground">Not a casino.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Fractional stock vaults on Robinhood Chain — sealed cards, verifiable reveal,
            claimable holdings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usps.map((u, i) => (
            <motion.article
              key={u.kicker}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: Math.min(i, 5) * 0.05, duration: 0.4 }}
              className="product-surface flex flex-col gap-3 p-6 sm:p-7"
            >
              <p className="font-mono text-[11px] text-primary">{u.kicker}</p>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">{u.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{u.body}</p>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/create?tab=instant"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            Instant Mint
          </Link>
          <Link
            href="/app"
            className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
          >
            View pools
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex h-11 items-center px-2 text-sm font-semibold text-primary hover:underline"
          >
            User guide
          </Link>
        </div>
      </div>
    </section>
  )
}
