"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

const faqs = [
  {
    question: "What do I need to fund a pool?",
    answer:
      "Wallet on Robinhood Chain. Quotes are in $SHERD; deposits settle to USDG in the vault. Pay with $SHERD, USDG, ETH, or WETH — or swap any token via Buy $SHERD / Bridge first.",
  },
  {
    question: "What is Instant Mint?",
    answer:
      "A $1.50 or $2 solo vault you fully bankroll. The deployer opens the pool (you skip the $5 create fee), you deposit, then stocks buy and your Sherd reveals in the same flow.",
  },
  {
    question: "What does the sealed card represent?",
    answer:
      "It records your deposit and claim on the pool. After reveal it shows ownership % and the stock amounts behind that claim.",
  },
  {
    question: "Do I choose the stocks?",
    answer:
      "No. You choose the pool (or Instant Mint) and amount. At seal the vault buys 2 to 5 stocks from the supported registry.",
  },
  {
    question: "Can the pool value fall?",
    answer:
      "Yes. Value tracks the stock tokens in the vault. Sherhood is experimental — you can lose some or all of what you deposit.",
  },
  {
    question: "Is Sherhood audited?",
    answer:
      "No external audit has been completed. Review terms, contract addresses, fees, and txs before funding.",
  },
]

export function FaqSection() {
  return (
    <section className="page-container-wide py-20 sm:py-28">
      <div className="grid gap-12 lg:grid-cols-[minmax(16rem,0.65fr)_minmax(0,1.35fr)] lg:gap-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Before you fund</p>
          <h2 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-5xl">
            Clear answers.
            <span className="block text-muted-foreground">No hidden steps.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
            The user guide covers wallets, fees, exits, card value, and trading in more detail.
          </p>
          <Link href="/docs/getting-started" className="touch-target mt-5 inline-flex items-center text-sm font-semibold text-primary hover:underline">
            Open the user guide
          </Link>
        </div>

        <div className="border-t border-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group border-b border-border">
              <summary className="touch-target flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-semibold text-foreground sm:py-6 sm:text-lg [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus aria-hidden className="shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="max-w-2xl pb-6 pr-10 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
