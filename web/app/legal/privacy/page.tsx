import type { Metadata } from "next"
import Link from "next/link"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Privacy Policy · Sherhood",
  description: "How Sherhood handles data for this experimental wallet interface.",
}

export default function PrivacyPolicyPage() {
  return (
    <PageShell narrow className="max-w-2xl pb-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ccff00]">Legal</p>
      <h1 className="mt-3 text-3xl font-normal tracking-[-0.6px] text-[#e5e7eb]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#999999]">Last updated: 15 July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-7 text-[#999999]">
        <section className="rounded-[14px] border border-[#333333] bg-[#0f0f0f] p-5">
          <p className="text-[#e5e7eb]">
            Sherhood is <strong>experimental software</strong>. This Policy describes data practices for
            the web interface at sherhood.xyz. It is not legal advice. Public blockchain activity is
            inherently public and cannot be made private by this site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">1. What we collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-[#e5e7eb]">Wallet address & on-chain data</strong> — when you
              connect a wallet, the interface reads public chain data (balances, approvals, basket
              deposits, cards). That data lives on the blockchain, not in a private Sherhood account
              database.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Local browser storage</strong> — wallet connection
              libraries (e.g. wagmi / RainbowKit / WalletConnect) may store session preference and
              connection state in your browser.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Technical logs / hosting</strong> — hosting (e.g.
              Vercel), RPC, and CDN providers may process IP addresses, user-agent, and request
              metadata as part of delivering the site. We do not intentionally build marketing
              profiles from that.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Optional third parties</strong> — price APIs,
              Telegram links, Orynth, explorers you open yourself; their policies apply separately.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">2. What we do not collect</h2>
          <p className="mt-2">
            We do not ask for government ID, seed phrases, or passwords. Never send private keys to
            anyone claiming to be Sherhood support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">3. How we use data</h2>
          <p className="mt-2">
            Interface data is used only to show protocol state, route transactions you initiate, and
            operate experimental features. Because the product is experimental, processing may change
            without notice (see{" "}
            <Link href="/legal/terms" className="text-[#ccff00] hover:underline">
              Terms
            </Link>
            ).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">4. Retention & “delete my account”</h2>
          <p className="mt-2">
            There is no traditional username/password account. Use{" "}
            <Link href="/profile" className="text-[#ccff00] hover:underline">
              Profile → Delete my account and data
            </Link>{" "}
            to disconnect your wallet from this browser and clear local/session storage used by the
            interface.
          </p>
          <p className="mt-2">
            <strong className="text-[#e5e7eb]">
              Blockchain records (deposits, NFTs, trades, addresses) cannot be deleted
            </strong>{" "}
            by Sherhood or by that button. That is a property of public ledgers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">5. Sharing</h2>
          <p className="mt-2">
            We do not sell personal data. Infrastructure vendors process requests to run the site.
            Compelled disclosure may occur if legally required.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">6. Children</h2>
          <p className="mt-2">The Service is not directed to children under 18 (or higher age of majority).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">7. International / experimental posture</h2>
          <p className="mt-2">
            Data may be processed in regions where hosting providers operate. Given the experimental
            nature of the Service, do not use it if you require enterprise privacy guarantees.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">8. Changes</h2>
          <p className="mt-2">
            We may update this Policy at any time. Continued use after posting means acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">9. Contact</h2>
          <p className="mt-2">
            <a
              href="https://t.me/sherhoodhub"
              className="text-[#ccff00] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </a>
          </p>
        </section>
      </div>
    </PageShell>
  )
}
