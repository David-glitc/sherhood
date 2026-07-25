import type { Metadata } from "next"
import Link from "next/link"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Terms of Service · Sherhood",
  description:
    "Terms for Sherhood — experimental Sherd pools, profiles, XP, and wallet interface on Robinhood Chain.",
}

export default function TermsOfServicePage() {
  return (
    <PageShell narrow className="max-w-2xl pb-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ccff00]">Legal</p>
      <h1 className="mt-3 text-3xl font-normal tracking-[-0.6px] text-[#e5e7eb]">Terms of Service</h1>
      <p className="mt-2 text-sm text-[#999999]">Last updated: 19 July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-7 text-[#999999]">
        <section className="rounded-[14px] border border-[#ccff00]/35 bg-[#0f0f0f] p-5">
          <h2 className="text-base font-semibold text-[#ccff00]">Experimental software — full exclusion</h2>
          <p className="mt-3 text-[#e5e7eb]">
            Sherhood is <strong>experimental, beta, unfinished software</strong>. It is offered solely
            for experimentation and research. By accessing sherhood.xyz or using any smart contracts,
            interfaces, APIs, or related materials (the “Service”), you acknowledge that the Service may
            contain bugs, incomplete features, incorrect displays, failed transactions, loss of
            funds, loss of access, security vulnerabilities, and total economic failure.
          </p>
          <p className="mt-3">
            <strong className="text-[#e5e7eb]">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,”
              WITH ALL FAULTS AND WITHOUT ANY WARRANTY, EXPRESS OR IMPLIED
            </strong>
            , including merchantability, fitness for a particular purpose, title, non-infringement,
            accuracy, or uninterrupted availability. Operators, contributors, affiliates, and
            deployers disclaim all liability for any loss—direct, indirect, incidental, special,
            consequential, exemplary, or punitive—including lost profits, lost data, lost digital
            assets, smart-contract exploit, oracle/randomness failure, slippage, fee misconfiguration,
            database outage, or third-party chain/wallet failures—whether or not advised of the
            possibility.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">1. Acceptance</h2>
          <p className="mt-2">
            If you do not agree to these Terms, do not use the Service. Connecting a wallet, creating
            a display profile, funding a Sherd pool, trading a Sherd, or continuing to browse after
            notice of updated Terms constitutes acceptance. These Terms form a binding agreement
            between you and the publishers of the Sherhood interface and related experimental
            deployments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">2. What Sherhood is</h2>
          <p className="mt-2">
            Sherhood is a non-custodial web interface and related smart contracts on Robinhood Chain
            that let users fund <strong className="text-[#e5e7eb]">Sherd pools</strong> (on-chain
            pots), mint sealed ownership NFTs (“Sherds”), reveal fractional claims on stock tokens,
            and trade Sherds. Optional off-chain features include display names, avatars, receive
            settings, XP/streaks derived from public chain activity, and leaderboards. Off-chain
            account data is stored in a database we operate (currently MongoDB Atlas) for the
            interface only — it does not custody assets.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">3. Not financial products; no advice</h2>
          <p className="mt-2">
            Sherhood is not a bank, broker-dealer, exchange, custodian, investment adviser, crowdfunding
            portal, or regulated marketplace. Nothing on the Service is an offer to sell or solicitation
            to buy securities, commodities, or any regulated instrument. Stock tokens and pool values
            can fall. Nothing is legal, tax, accounting, or investment advice. You are solely
            responsible for determining legality in your jurisdiction and for your tax obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">4. Blockchain risk</h2>
          <p className="mt-2">
            Interactions occur via public blockchains (including Robinhood Chain). Transactions are
            generally irreversible. Smart contracts may be immutable or upgradeable only by privileged
            keys you do not control. Randomness (including PrevRandao), Uniswap routes, stock-token
            lists, and fee parameters may change or fail.{" "}
            <strong className="text-[#e5e7eb]">You may lose some or all deposited value.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">5. Eligibility</h2>
          <p className="mt-2">
            You represent that you are of legal age and that use of the Service is lawful where you
            reside. You must not use the Service if you are subject to sanctions or if local law
            prohibits interacting with experimental DeFi or tokenized equity-like instruments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">6. Wallets, profiles, and accounts</h2>
          <p className="mt-2">
            Access is primarily wallet-based. We do not custody your private keys. You are responsible
            for wallet security, approvals, phishing, and device compromise.
          </p>
          <p className="mt-2">
            You may create an optional <strong className="text-[#e5e7eb]">display profile</strong>{" "}
            (unique name, avatar, allow-receive) by signing a message with your wallet. Profile and
            related off-chain records (including cached XP, streaks, actions, and activity summaries)
            are stored in our database and linked to your public wallet address. Names must not
            impersonate others, violate law, or infringe rights; we may reclaim or remove names.
          </p>
          <p className="mt-2">
            Use{" "}
            <Link href="/profile" className="text-[#ccff00] hover:underline">
              Profile → Delete my account
            </Link>{" "}
            and a signed confirmation to erase off-chain profile and cached stats we store.{" "}
            <strong className="text-[#e5e7eb]">
              On-chain deposits, Sherds, trades, and wallet addresses cannot be deleted
            </strong>{" "}
            — that is a property of public ledgers. See the{" "}
            <Link href="/legal/privacy" className="text-[#ccff00] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">7. XP, streaks, and leaderboards</h2>
          <p className="mt-2">
            XP and streaks are non-transferable interface scores derived from public on-chain actions.
            They are not money, securities, or redeemable value. We may recalculate, pause, or change
            scoring rules at any time. Cached scores in our database may lag the chain.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">8. Prohibited use</h2>
          <p className="mt-2">
            You must not attack, disrupt, exploit, scrape abusively, spam profiles/sends, or use the
            Service to violate law, launder proceeds, or harm others. Automated abuse or circumvention
            of safeguards is prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">9. Third parties</h2>
          <p className="mt-2">
            WalletConnect, wallet software, RPC providers, Uniswap, Robinhood Chain, MongoDB Atlas,
            Vercel, Orynth, Telegram, OpenSea, price APIs, and other third parties are outside our
            control. Their terms and failures are their responsibility; we exclude liability for them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">10. Indemnity</h2>
          <p className="mt-2">
            You agree to indemnify and hold harmless the publishers, operators, contributors, and
            affiliates from claims arising out of your use of the Service, your profile content, your
            violation of these Terms, or your violation of any law or third-party right.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">11. Limitation of liability</h2>
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
          <h2 className="text-lg font-semibold text-[#e5e7eb]">12. Changes; termination</h2>
          <p className="mt-2">
            We may modify, pause, or discontinue the Service or these Terms at any time without notice.
            Your continued use after changes means acceptance. We may refuse access, remove profiles,
            or purge off-chain data for any reason, including abuse or legal risk.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">13. Governing law</h2>
          <p className="mt-2">
            These Terms are governed by the laws applicable to the publisher’s principal place of
            organization, without regard to conflict-of-law rules, except where mandatory consumer
            protections apply. Disputes shall be resolved in the courts of that venue unless mandatory
            law requires otherwise. If any provision is unenforceable, the remainder stays in effect.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">14. Contact</h2>
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
