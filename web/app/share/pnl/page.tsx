import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function pick(v: string | string[] | undefined, fallback = "0") {
  if (Array.isArray(v)) return v[0] ?? fallback
  return v ?? fallback
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const name = pick(sp.name, "Trader").slice(0, 32)
  const mark = pick(sp.mark)
  const cost = pick(sp.cost)
  const pnl = pick(sp.pnl)
  const qs = new URLSearchParams({ name, mark, cost, pnl }).toString()
  const image = `${SITE_URL}/api/og/pnl?${qs}`
  const pnlN = Number(pnl)
  const title = `${name} · ${pnlN >= 0 ? "+" : ""}$${Number.isFinite(pnlN) ? pnlN.toFixed(2) : "0.00"} PnL`
  const description = `Mark $${Number(mark).toFixed?.(2) ?? mark} vs cost $${Number(cost).toFixed?.(2) ?? cost} on Sherhood.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/share/pnl?${qs}`,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: "@sherhood_xyz",
      creator: "@sherhood_xyz",
    },
  }
}

export default async function SharePnlPage({ searchParams }: Props) {
  const sp = await searchParams
  const name = pick(sp.name, "Trader").slice(0, 32)
  const mark = Number(pick(sp.mark))
  const cost = Number(pick(sp.cost))
  const pnl = Number(pick(sp.pnl, String(mark - cost)))
  const profit = pnl >= 0
  const pct = cost > 0 ? (pnl / cost) * 100 : 0

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ccff00]/80">
        Sherhood PnL
      </p>
      <h1 className="mt-2 text-2xl font-bold text-white">{name}</h1>
      <p
        className={`mt-4 text-5xl font-black tabular-nums tracking-tight ${
          profit ? "text-[#ccff00]" : "text-red-400"
        }`}
      >
        {profit ? "+" : ""}
        ${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      <p className="mt-2 text-sm text-white/50">
        {pct >= 0 ? "+" : ""}
        {pct.toFixed(2)}% · Mark ${mark.toFixed(2)} · Cost ${cost.toFixed(2)}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/profile"
          className="rounded-full bg-[#ccff00] px-5 py-2.5 text-sm font-bold text-[#050806]"
        >
          Open profile
        </Link>
        <Link
          href="/app"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Explore pools
        </Link>
      </div>
    </main>
  )
}
