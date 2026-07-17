import { CinematicHero } from "@/components/landing/cinematic-hero"
import { HowItWorksSection } from "@/components/landing/how-it-works"
import { CtaSection } from "@/components/landing/cta-section"
import { LiveBasketsSection } from "@/components/landing/live-baskets"
import { ValuePropsSection } from "@/components/landing/value-props"
import { StocksMarqueeSection } from "@/components/landing/stocks-marquee"
import { FaqSection } from "@/components/landing/faq-section"

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Sherhood",
  url: "https://sherhood.xyz",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Fractional stock baskets on Robinhood Chain. Fund, mint a mystery card, reveal ownership.",
  author: { "@type": "Organization", name: "Sherhood" },
}

export default function LandingPage() {
  return (
    <div data-landing>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CinematicHero />
      <LiveBasketsSection />
      <HowItWorksSection />
      <ValuePropsSection />
      <StocksMarqueeSection />
      <FaqSection />
      <CtaSection />
    </div>
  )
}
