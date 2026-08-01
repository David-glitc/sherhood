import dynamic from "next/dynamic"
import { CinematicHero } from "@/components/landing/cinematic-hero"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo"
import { OPENSEA_COLLECTION_URL } from "@/lib/protocol"

const LiveBasketsSection = dynamic(
  () =>
    import("@/components/landing/live-baskets").then((m) => m.LiveBasketsSection),
  {
    loading: () => (
      <div className="page-container-wide py-16 sm:py-20" aria-hidden>
        <div className="product-surface h-52 animate-pulse" />
      </div>
    ),
  }
)
const WhySection = dynamic(() =>
  import("@/components/landing/why-section").then((m) => m.WhySection)
)
const HowItWorksSection = dynamic(() =>
  import("@/components/landing/how-it-works").then((m) => m.HowItWorksSection)
)
const ValuePropsSection = dynamic(() =>
  import("@/components/landing/value-props").then((m) => m.ValuePropsSection)
)
const OpenSeaCollectionSection = dynamic(() =>
  import("@/components/landing/opensea-collection").then((m) => m.OpenSeaCollectionSection)
)
const StocksMarqueeSection = dynamic(() =>
  import("@/components/landing/stocks-marquee").then((m) => m.StocksMarqueeSection)
)
const FaqSection = dynamic(() =>
  import("@/components/landing/faq-section").then((m) => m.FaqSection)
)
const CtaSection = dynamic(() =>
  import("@/components/landing/cta-section").then((m) => m.CtaSection)
)

const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  author: { "@type": "Organization", name: SITE_NAME },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
}

const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Sherds on OpenSea",
  url: OPENSEA_COLLECTION_URL,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  about: "Fractional stock basket Sherd NFTs on Robinhood Chain",
}

export default function LandingPage() {
  return (
    <div data-landing>
      <link rel="preload" as="image" href="/cards/mystery-hero-lcp.webp" type="image/webp" />
      <JsonLd data={appLd} />
      <JsonLd data={collectionLd} />
      <CinematicHero />
      <LiveBasketsSection />
      <WhySection />
      <OpenSeaCollectionSection />
      <HowItWorksSection />
      <ValuePropsSection />
      <StocksMarqueeSection />
      <FaqSection />
      <CtaSection />
    </div>
  )
}
