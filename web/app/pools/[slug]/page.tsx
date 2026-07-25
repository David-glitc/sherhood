import type { Metadata } from "next"
import { Suspense } from "react"
import { buildPageMetadata } from "@/lib/seo"
import { fetchPotShareData } from "@/lib/share-data"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE_URL } from "@/lib/seo"
import BasketDetailPage from "./basket-client"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const pot = await fetchPotShareData(slug)

  if (!pot) {
    return buildPageMetadata({
      title: "Pool",
      description: "Open a Sherhood stock basket on Robinhood Chain.",
      path: `/pools/${slug}`,
      noIndex: true,
    })
  }

  return buildPageMetadata({
    title: `${pot.name} · ${pot.statusLabel}`,
    description: pot.description,
    path: pot.pagePath,
    image: absoluteOg(`/pools/${pot.address}/opengraph-image`),
  })
}

function absoluteOg(path: string) {
  return `${SITE_URL}${path}`
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const pot = await fetchPotShareData(slug)

  return (
    <>
      {pot ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: pot.name,
            description: pot.description,
            url: `${SITE_URL}${pot.pagePath}`,
            brand: { "@type": "Brand", name: "Sherhood" },
            category: "Fractional stock basket",
            offers: {
              "@type": "Offer",
              availability:
                pot.status === 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/SoldOut",
              priceCurrency: "USD",
              price: pot.totalDepositedFmt.replace(/,/g, ""),
              url: `${SITE_URL}${pot.pagePath}`,
            },
          }}
        />
      ) : null}
      {pot ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Pools",
                item: `${SITE_URL}/app`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: pot.name,
                item: `${SITE_URL}${pot.pagePath}`,
              },
            ],
          }}
        />
      ) : null}
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="h-8 w-40 animate-pulse rounded-full bg-[#191919]" />
            <div className="mt-10 h-16 w-64 animate-pulse rounded-2xl bg-[#191919]" />
          </div>
        }
      >
        <BasketDetailPage />
      </Suspense>
    </>
  )
}
