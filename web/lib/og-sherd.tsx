import { ImageResponse } from "next/og"
import { loadBrandBanner, OG_SIZE, OgFrame } from "@/lib/og-frame"
import { fetchSherdShareData } from "@/lib/share-data"

/** Shared Sherd OG/Twitter image — used by opengraph-image + twitter-image routes. */
export async function renderSherdOgImage(id: string) {
  const banner = await loadBrandBanner()
  const sherd = await fetchSherdShareData(id)

  if (!sherd) {
    return new ImageResponse(
      (
        <OgFrame
          banner={banner}
          eyebrow="SHERHOOD SHERD"
          title={`Sherd #${id}`}
          subtitle="Mystery ownership card on Robinhood Chain"
        />
      ),
      { ...OG_SIZE }
    )
  }

  const subtitle = sherd.revealed
    ? `${sherd.rarityLabel} · ${sherd.ownershipPct}% of ${sherd.potName}${
        sherd.holdings.length ? ` · ${sherd.holdings.join(" + ")}` : ""
      }`
    : `Sealed · ${sherd.potName} · $${sherd.depositFmt} deposited`
  const ownerDisplay = sherd.ownerName ? `@${sherd.ownerName}` : sherd.ownerLabel
  const footer = sherd.revealed
    ? `Owner ${ownerDisplay} · ${sherd.assets.slice(0, 2).map((a) => `${a.symbol} ${a.amountFmt}`).join(" · ") || "Collect stocks like gacha cards"} · sherhood.xyz`
    : `Owner ${ownerDisplay} · Sealed until reveal · sherhood.xyz`

  return new ImageResponse(
    (
      <OgFrame
        banner={banner}
        eyebrow="SHERHOOD SHERD"
        title={`Sherd #${sherd.tokenId}`}
        subtitle={subtitle}
        badge={sherd.rarityLabel.toUpperCase()}
        footer={footer}
      />
    ),
    { ...OG_SIZE }
  )
}
