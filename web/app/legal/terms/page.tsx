import type { Metadata } from "next"
import Link from "next/link"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Terms of Service · Sherhood",
  description:
    "Experimental software terms — full risk exclusion for Sherhood on Robinhood Chain.",
}

export default function TermsOfServicePage() {
  return (
    <PageShell narrow className="max-w-2xl pb-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ccff00]">Legal</p>
      <h1 className="mt-3 text-3xl font-normal tracking-[-0.6px] text-[#e5e7eb]">Terms of Service</h1>
      <p className="mt-2 text-sm text-[#999999]">Last updated: 15 July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-7 text-[#999999]">
        <section className="rounded-[14px] border border-[#ccff00]/35 bg-[#0f0f0f] p-5">
          <h2 className="text-base font-semibold text-[#ccff00]">Experimental software — full exclusion</h2>
          <p className="mt-3 text-[#e5e7eb]">
            Sherhood is <strong>experimental, beta, unfinished software</strong>. It is offered solely
            for experimentation and research. By accessing sherhood.xyz or using any smart contracts,
            interfaces, or related materials (the “Service”), you acknowledge that the Service may
            contain bugs, incomplete features, incorrect displays, failed transactions, loss of
            funds, loss of access, security vulnerabilities, and total economic failure.
          </p>
          <p className="mt-3">
            <strong className="text-[#e5e7eb]">TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITH ALL FAULTS AND WITHOUT ANY WARRANTY, EXPRESS OR IMPLIED</strong>
            , including merchantability, fitness for a particular purpose, title, non-infringement,
            accuracy, or uninterrupted availability. Operators, contributors, affiliates, and
            deployers disclaim all liability for any loss—direct, indirect, incidental, special,
            consequential, exemplary, or punitive—including lost profits, lost data, lost digital
            assets, smart-contract exploit, oracle/randomness failure, slippage, fee misconfiguration,
            or third-party chain/wallet failures—whether or not advised of the possibility.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">1. Acceptance</h2>
          <p className="mt-2">
            If you do not agree to these Terms, do not use the Service. Continued use constitutes
            acceptance. These Terms form a binding agreement between you and the publishers of the
            Sherhood interface and related experimental deployments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">2. Not financial products; no advice</h2>
          <p className="mt-2">
            Sherhood is not a bank, broker-dealer, exchange, custodian, investment adviser, crowdfunding
            portal, or regulated marketplace. Nothing on the Service is an offer to sell or solicitation
            to buy securities, commodities, or any regulated instrument. Nothing is legal, tax,
            accounting, or investment advice. You are solely responsible for determining legality in
            your jurisdiction and for your tax obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">3. Blockchain risk</h2>
          <p className="mt-2">
            Interactions occur via public blockchains (including Robinhood Chain). Transactions are
            generally irreversible. Smart contracts may be immutable or upgradeable only by privileged
            keys you do not control. Randomness (including PrevRandao), Uniswap routes, stock-token
            lists, and fee parameters may change or fail.{" "}
            <strong className="text-[#e5e7eb]">You may lose some or all deposited value.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">4. Eligibility</h2>
          <p className="mt-2">
            You represent that you are of legal age and that use of the Service is lawful where you
            reside. You must not use the Service if you are subject to sanctions or if local law
            prohibits interacting with experimental DeFi or tokenized equity-like instruments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">5. Your wallet; no accounts we control</h2>
          <p className="mt-2">
            Access is primarily wallet-based. We do not custody your private keys. You are responsible
            for wallet security, approvals, phishing, and device compromise. See Privacy for how to
            clear local interface data via{" "}
            <Link href="/profile" className="text-[#ccff00] hover:underline">
              Profile → Delete my account and data
            </Link>
            . On-chain records cannot be erased by that control.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">6. Prohibited use</h2>
          <p className="mt-2">
            You must not attack, disrupt, exploit, scrape abusively, or use the Service to violate law,
            launder proceeds, or harm others. Automated abuse or circumvention of safeguards is
            prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">7. Third parties</h2>
          <p className="mt-2">
            WalletConnect, wallet software, RPC providers, Uniswap, Robinhood Chain, Orynth, Telegram,
            price APIs, and other third parties are outside our control. Their terms and failures are
            their responsibility; we exclude liability for them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">8. Indemnity</h2>
          <p className="mt-2">
            You agree to indemnify and hold harmless the publishers, operators, contributors, and
            affiliates from claims arising out of your use of the Service, your violation of these
            Terms, or your violation of any law or third-party right.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">9. Limitation of liability</h2>
          <p className="mt-2">
            To the fullest extent permitted by applicable law, aggregate liability arising from the
            Service is limited to zero (USD $0) or the minimum amount required by law that cannot be
            waived. Some jurisdictions do not allow certain exclusions; in those cases exclusions
            apply to the maximum extent allowed.{" "}
            <strong className="text-[#e5e7eb]">
              Nothing in these Terms excludes liability that cannot legally be excluded, but all
              other liability is disclaimed.
            </strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">10. Changes; termination</h2>
          <p className="mt-2">
            We may modify, pause, or discontinue the Service or these Terms at any time without notice.
            Your continued use after changes means acceptance. We may refuse access for any reason.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">11. Governing law</h2>
          <p className="mt-2">
            These Terms are governed by the laws applicable to the publisher’s principal place of
            organization, without regard to conflict-of-law rules, except where mandatory consumer
            protections apply. Disputes shall be resolved in the courts of that venue unless mandatory
            law requires otherwise. If any provision is unenforceable, the remainder stays in effect.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">12. Contact</h2>
          <p className="mt-2">
            Community:{" "}
            <a
              href="https://t.me/sherhoodhub"
              className="text-[#ccff00] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </a>
            . Also see the{" "}
            <Link href="/legal/privacy" className="text-[#ccff00] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </PageShell>
  )
}
