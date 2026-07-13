import Link from "next/link"

export const metadata = {
  title: "Allocation EV — Sherwood",
  description: "Transparent expected-value documentation for Sherwood ownership allocation.",
}

export default function AllocationDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose prose-invert prose-zinc">
      <p className="text-xs uppercase tracking-widest text-robinhood">Protocol docs</p>
      <h1 className="mt-2 text-4xl font-black text-zinc-100">Allocation & expected value</h1>
      <p className="text-zinc-400">
        How Sherwood assigns fractional ownership. Full source of truth also lives in{" "}
        <code className="text-zinc-300">cursor_project_rules/allocation-ev.mdc</code>.
      </p>

      <h2 className="text-xl font-bold text-zinc-100">Guarantees</h2>
      <ul className="list-disc space-y-2 pl-5 text-zinc-400">
        <li>All card weights sum to exactly 100% of the pot.</li>
        <li>Every card receives ownership &gt; 0 — chance never wipes you out.</li>
        <li>Expected ownership tracks your deposit share of the pot.</li>
      </ul>

      <h2 className="text-xl font-bold text-zinc-100">How weights are drawn</h2>
      <ol className="list-decimal space-y-2 pl-5 text-zinc-400">
        <li>Each card gets a VRF multiplier uniformly in [0.50×, 2.00×].</li>
        <li>
          Raw score = deposit × multiplier. Scores are normalized so the sum is 1e18.
        </li>
        <li>
          Rarity bands: Common &lt; 0.90, Rare &lt; 1.20, Epic &lt; 1.60, Legendary ≥ 1.60.
        </li>
      </ol>

      <h2 className="text-xl font-bold text-zinc-100">Expected value</h2>
      <p className="text-zinc-400">
        Mean multiplier is 1.25. Because every participant draws from the same distribution and
        results are normalized, your expected ownership is approximately{" "}
        <strong className="text-zinc-200">deposit ÷ pot total</strong>. Variance reshuffles
        outcomes roughly between ~0.4× and ~1.6× fair share in typical equal-deposit pots — never
        to zero.
      </p>

      <h2 className="text-xl font-bold text-zinc-100">Fees (separate from allocation)</h2>
      <ul className="list-disc space-y-2 pl-5 text-zinc-400">
        <li>Optional entry fee per deposit</li>
        <li>Protocol fee (bps) taken before asset purchase</li>
        <li>Community pot creation fee</li>
        <li>Marketplace royalty on secondary sales</li>
      </ul>

      <p className="mt-10 text-sm text-zinc-600">
        <Link href="/app" className="text-zinc-400 underline hover:text-zinc-200">
          Back to pots
        </Link>
        {" · "}
        <Link href="/create" className="text-zinc-400 underline hover:text-zinc-200">
          Create a pot
        </Link>
      </p>
    </div>
  )
}
