import type { Metadata } from "next"
import Link from "next/link"
import { buildPageMetadata, SITE_URL } from "@/lib/seo"
import { fetchSherdShareData } from "@/lib/share-data"
import { JsonLd } from "@/components/seo/json-ld"
import { SherdShareClient } from "./sherd-client"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const sherd = await fetchSherdShareData(id)

  if (!sherd) {
    return buildPageMetadata({
      title: `Sherd #${id}`,
      description: "Sherhood ownership Sherd on Robinhood Chain.",
      path: `/sherds/${id}`,
      noIndex: true,
    })
  }

  return buildPageMetadata({
    title: sherd.revealed
      ? `Sherd #${id} · ${sherd.rarityLabel}`
      : `Sherd #${id} · Sealed`,
    description: sherd.description,
    path: sherd.pagePath,
    image: `${SITE_URL}/sherds/${id}/opengraph-image`,
  })
}

export default async function SherdPage({ params }: Props) {
  const { id } = await params
  const sherd = await fetchSherdShareData(id)

  if (!sherd) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24">
        <Link href="/inventory" className="text-sm text-[#999999] hover:text-[#ccff00]">
          Inventory
        </Link>
        <h1 className="mt-8 text-[30px] font-normal tracking-[-0.6px] text-[#e5e7eb]">
          Sherd not found
        </h1>
        <p className="mt-3 text-base leading-[22px] tracking-[-0.4px] text-[#999999]">
          This token may be burned, claimed, or not minted yet.
        </p>
      </div>
    )
  }

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `Sherd #${sherd.tokenId}`,
          description: sherd.description,
          image: sherd.image,
          url: `${SITE_URL}${sherd.pagePath}`,
          brand: { "@type": "Brand", name: "Sherhood" },
          category: "NFT",
          additionalProperty: [
            { "@type": "PropertyValue", name: "Rarity", value: sherd.rarityLabel },
            { "@type": "PropertyValue", name: "Pool", value: sherd.potName },
            ...(sherd.revealed
              ? [
                  {
                    "@type": "PropertyValue",
                    name: "Ownership",
                    value: `${sherd.ownershipPct}%`,
                  },
                ]
              : []),
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Sherds",
              item: `${SITE_URL}/inventory`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: `Sherd #${sherd.tokenId}`,
              item: `${SITE_URL}${sherd.pagePath}`,
            },
          ],
        }}
      />
      <SherdShareClient sherd={sherd} />
    </>
  )
}
