import type { Metadata } from "next"
import Link from "next/link"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Privacy Policy · Sherhood",
  description:
    "How Sherhood processes wallet, profile, XP, and technical data for the experimental interface.",
}

export default function PrivacyPolicyPage() {
  return (
    <PageShell narrow className="max-w-2xl pb-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ccff00]">Legal</p>
      <h1 className="mt-3 text-3xl font-normal tracking-[-0.6px] text-[#e5e7eb]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#999999]">Last updated: 19 July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-7 text-[#999999]">
        <section className="rounded-[14px] border border-[#333333] bg-[#0f0f0f] p-5">
          <p className="text-[#e5e7eb]">
            Sherhood is <strong>experimental software</strong>. This Policy describes data practices for
            the web interface at sherhood.xyz and related APIs. It is not legal advice. Public
            blockchain activity is inherently public and cannot be made private by this site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">1. Controllers and scope</h2>
          <p className="mt-2">
            This Policy covers the Sherhood interface operators (“we”, “us”). It applies when you use
            sherhood.xyz, connect a wallet, save a profile, view leaderboards, or call our APIs. It
            does not cover third-party wallets, explorers, OpenSea, Telegram, Orynth, or RPC providers
            you use independently.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">2. Categories of data</h2>
          <ul className="mt-2 list-disc space-y-3 pl-5">
            <li>
              <strong className="text-[#e5e7eb]">Wallet & on-chain data</strong> — public addresses,
              balances, approvals, Sherd pool deposits, Sherd ownership, marketplace listings/trades.
              This data is read from Robinhood Chain (and related RPCs). We do not receive your private
              keys or seed phrases.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Display profile (database)</strong> — if you opt in
              by signing a message: unique display name, URL slug, avatar id, allow-receive flag,
              wallet address, and update timestamp. Stored in{" "}
              <strong className="text-[#e5e7eb]">MongoDB Atlas</strong> (database <code>sherhood</code>
              , collection <code>profiles</code>).
            </li>
            <li>
              <strong className="text-[#e5e7eb]">XP, streaks, actions, activity cache</strong> —
              derived from public chain events (deposits, creates, claims, trades, etc.). We may
              materialize and cache scores and activity timelines in MongoDB (
              <code>wallet_scores</code>, <code>profile_stats</code>, <code>xp_events</code>) to make
              leaderboards and profile pages load faster. These scores are not financial instruments.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Signatures</strong> — wallet signatures used to prove
              control when saving or deleting a profile. Signatures are verified server-side; we do
              not use them to move funds.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Local browser storage</strong> — wagmi / RainbowKit /
              WalletConnect session state and a local profile cache for faster UI. Clearing the
              browser or using Delete my account removes local copies.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Technical / hosting logs</strong> — Vercel, CDN, RPC,
              and Atlas may process IP address, user-agent, request path/timing, and error logs to
              deliver and secure the Service. We do not sell this for advertising profiles.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Optional third parties</strong> — price APIs, Telegram,
              OpenSea, Orynth, explorers you open yourself; their policies apply separately.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">3. What we do not collect</h2>
          <p className="mt-2">
            We do not ask for government ID, passwords, seed phrases, or payment card numbers for
            Sherhood accounts. Never send private keys to anyone claiming to be Sherhood support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">4. Purposes of processing</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Show protocol state and route transactions you initiate</li>
            <li>Operate display profiles, People directory, and allow-receive sends</li>
            <li>Compute and display XP, streaks, actions, and leaderboards</li>
            <li>Improve reliability, security, and performance (caching, abuse prevention)</li>
            <li>Comply with law if compelled</li>
          </ul>
          <p className="mt-2">
            Because the product is experimental, features and retention may change without notice
            (see{" "}
            <Link href="/legal/terms" className="text-[#ccff00] hover:underline">
              Terms
            </Link>
            ).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">5. Legal bases (where applicable)</h2>
          <p className="mt-2">
            Where GDPR/UK GDPR or similar laws apply, we rely on: (a) your consent / contractual
            necessity for optional profiles you create by signing; (b) legitimate interests in
            operating a public experimental interface, caching public chain-derived stats, and
            securing the Service; and (c) legal obligation when disclosure is required.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">6. Retention & Delete my account</h2>
          <p className="mt-2">
            Profiles and cached XP/activity remain until you delete them or we purge data for abuse,
            legal, or operational reasons. Use{" "}
            <Link href="/profile" className="text-[#ccff00] hover:underline">
              Profile → Delete my account
            </Link>{" "}
            and sign the deletion message to remove your MongoDB profile and associated off-chain
            caches, then clear this browser’s interface storage and disconnect the wallet.
          </p>
          <p className="mt-2">
            <strong className="text-[#e5e7eb]">
              Blockchain records (deposits, NFTs, trades, addresses) cannot be deleted
            </strong>{" "}
            by Sherhood. Re-indexing public chain activity may recreate XP caches for an address
            that remains active on-chain even after profile deletion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">7. Sharing and processors</h2>
          <p className="mt-2">
            We do not sell personal data. Infrastructure processors (including Vercel hosting and
            MongoDB Atlas) process data to run the Service under their terms. Public profile fields
            you enable (name, avatar, and wallet if allow-receive is on) are visible to other users.
            Compelled disclosure may occur if legally required.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">8. International transfers</h2>
          <p className="mt-2">
            Hosting and database providers may process data in the United States and other regions.
            Do not use the Service if you require enterprise residency or contractual SCCs tailored
            to your organization — this is experimental consumer software.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">9. Security</h2>
          <p className="mt-2">
            We use HTTPS, signed profile updates, and standard cloud controls. No method of
            transmission or storage is 100% secure. You are responsible for wallet and device
            security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">10. Children</h2>
          <p className="mt-2">
            The Service is not directed to children under 18 (or higher age of majority in your
            jurisdiction).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">11. Your rights</h2>
          <p className="mt-2">
            Depending on your location, you may have rights to access, correct, or erase personal
            data we hold off-chain. Profile edit and Delete my account are the primary self-serve
            tools. Contact us via Telegram for residual requests. We may ask you to prove wallet
            control. Rights do not extend to rewriting public blockchain history.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">12. Changes</h2>
          <p className="mt-2">
            We may update this Policy at any time by posting a new version with an updated date.
            Continued use after posting means acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e5e7eb]">13. Contact</h2>
          <p className="mt-2">
            <a
              href="https://t.me/sherhoodhub"
              className="text-[#ccff00] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </a>
            {" · "}
            <Link href="/legal/terms" className="text-[#ccff00] hover:underline">
              Terms of Service
            </Link>
          </p>
        </section>
      </div>
    </PageShell>
  )
}
