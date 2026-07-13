import Link from "next/link"
import { HeroSection } from "@/components/landing/hero-section"
import { TiersSection } from "@/components/landing/tiers-section"
import { HowItWorksSection } from "@/components/landing/how-it-works"
import { WhySection } from "@/components/landing/why-section"
import { CtaSection } from "@/components/landing/cta-section"

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Sherhood",
  url: "https://sherhood.online",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Fractional Asset Loot on Robinhood Chain. Join pots, mint mystery cards, reveal ownership of Stock Tokens.",
  author: { "@type": "Organization", name: "Sherhood" },
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <TiersSection />
      <HowItWorksSection />
      <WhySection />
      <CtaSection />
      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-600">
        <span className="font-heading text-zinc-400">Sherhood</span> · Robinhood Chain ·{" "}
        <Link href="/docs/allocation" className="hover:text-zinc-300">
          Allocation docs
        </Link>
      </footer>
    </>
  )
}
