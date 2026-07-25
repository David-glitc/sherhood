"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

const faqs = [
  {
    question: "What do I need to fund a pool?",
    answer: "Connect a wallet on Robinhood Chain. You need ETH for network fees and USDG, ETH, or WETH for the deposit.",
  },
  {
    question: "What does the sealed card represent?",
    answer: "It records your deposit and your claim on the pool. After reveal, it shows the exact ownership percentage and stock amounts behind that claim.",
  },
  {
    question: "Do I choose the stocks?",
    answer: "No. You choose the pool and deposit amount. When funding closes, the pool buys 2 to 5 stocks from the supported pool.",
  },
  {
    question: "Can the pool value fall?",
    answer: "Yes. The value moves with the stock tokens held by the pool. Sherhood is experimental, and you can lose some or all of the value you deposit.",
  },
  {
    question: "Can I leave before reveal?",
    answer: "You can exit while funding is open and receive the refund shown in the app. After funding closes, wait for reveal and then claim or trade.",
  },
  {
    question: "Is Sherhood audited?",
    answer: "No external audit has been completed. Review the terms, contract addresses, fees, and transaction details before funding.",
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
