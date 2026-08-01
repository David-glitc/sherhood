import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { SHERHOOD_TAGLINE } from "@/lib/protocol"

export const metadata: Metadata = {
  title: "Roadmap — Sherhood",
  description: `${SHERHOOD_TAGLINE}. Product roadmap for Sherhood.`,
}

type Item = {
  title: string
  body: string
  status: "now" | "next" | "later"
  href?: string
}

const ITEMS: Item[] = [
  {
    status: "now",
    title: "Instant Mint",
    body: "Solo $1.50–$2 vault. Deployer opens the pool (no $5 create fee). You fund, stocks buy, Sherd reveals in one flow.",
    href: "/create?tab=instant",
  },
  {
    status: "now",
    title: "List once — OpenSea + Market",
    body: "Seaport listings from the app show on OpenSea and Sherhood Market together.",
    href: "/marketplace",
  },
  {
    status: "now",
    title: "Bridge into Robinhood Chain",
    body: "Relay supports many source chains. Destination defaults to Robinhood Chain.",
    href: "/bridge",
  },
  {
    status: "now",
    title: "Card-first product surfaces",
    body: "Pool, Sherd, and Market pages lead with visuals — less copy, clearer actions.",
    href: "/sherds",
  },
  {
    status: "now",
    title: "Profiles and XP",
    body: "Portfolio mark, on-chain XP, streaks, and your collection in one place.",
    href: "/profile",
  },
  {
    status: "next",
    title: "Sherhood V2 — protocol upgrade",
    body: "Hardened factory, reveal entropy, and pot lifecycle fixes. Live pools keep running on today’s contracts; V2 ships the upgraded stack.",
    href: "/docs/v2",
  },
  {
    status: "next",
    title: "Crafted Sherd art + metadata",
    body: "V2 ships a full metadata refresh with in-house card art. Until then we keep the current mint rarity set.",
  },
  {
    status: "next",
    title: "Buy without leaving Sherhood",
    body: "Fulfill the same OpenSea Seaport order from Market.",
  },
  {
    status: "next",
    title: "Any-token → $SHERD vault settle",
    body: "Full on-chain denomination in $SHERD. Today quotes are $SHERD-first; vaults still settle USDG for stock buys.",
    href: "/buy-shrd",
  },
  {
    status: "next",
    title: "Index pools and NAV redeem",
    body: "Pools that track a portfolio value, with redeem against live NAV.",
  },
  {
    status: "later",
    title: "Community token listings",
    body: "Reviewed listings for community tokens into curated pools.",
  },
]

const STATUS_LABEL = {
  now: "Live",
  next: "Building",
  later: "Exploring",
} as const

const STATUS_STYLE = {
  now: "border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00]",
  next: "border-[#333] bg-[#111] text-[#e5e7eb]",
  later: "border-[#222] bg-transparent text-[#777]",
} as const

export default function RoadmapPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Roadmap"
        title="What we’re building"
        description="Clear priorities for Sherhood — live product now, protocol V2 coming soon."
      />

      <aside className="mb-8 rounded-2xl border border-[#ccff00]/35 bg-[#ccff00]/[0.07] px-5 py-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ccff00]">
          Coming soon
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight text-white">
          Sherhood V2
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#c4c4c4]">
          App improvements keep shipping on the live factory. The next protocol
          deploy — hardened pots, reveal, and factory — is paused for V2 so
          current vaults stay claimable without a mid-flight cutover.
        </p>
        <Link
          href="/docs/v2"
          className="mt-3 inline-block text-sm font-medium text-[#ccff00] hover:underline"
        >
          Read the V2 plan
        </Link>
      </aside>

      <p className="mb-8 text-sm text-[#999]">
        Longer write-up:{" "}
        <Link href="/docs/v2" className="text-[#ccff00] hover:underline">
          V2 notes
        </Link>
        .
      </p>

      <div className="mb-8 flex flex-wrap gap-2 text-[12px]">
        {(["now", "next", "later"] as const).map((s) => (
          <span
            key={s}
            className={`rounded-full border px-3 py-1 font-medium ${STATUS_STYLE[s]}`}
          >
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <ol className="space-y-4">
        {ITEMS.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${STATUS_STYLE[item.status]}`}
              >
                {STATUS_LABEL[item.status]}
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-[#e5e7eb]">
                {item.href ? (
                  <Link href={item.href} className="hover:text-[#ccff00]">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#999]">{item.body}</p>
          </li>
        ))}
      </ol>
    </PageShell>
  )
}
