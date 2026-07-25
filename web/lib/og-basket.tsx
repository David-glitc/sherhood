import { ImageResponse } from "next/og"
import { isAddress, getAddress } from "viem"
import { loadBrandBanner, OG_SIZE, OgFrame } from "@/lib/og-frame"
import { fetchPotShareData } from "@/lib/share-data"
import { basketName } from "@/lib/basket-name"
import { deadlineLabel } from "@/hooks/use-pots"

/** Shared basket OG/Twitter image — used by opengraph-image + twitter-image routes. */
export async function renderBasketOgImage(slug: string) {
  const banner = await loadBrandBanner()
  const pot = await fetchPotShareData(slug)

  if (!pot) {
    const fallbackName = isAddress(slug) ? basketName(getAddress(slug)) : "Pool"
    return new ImageResponse(
      (
        <OgFrame
          banner={banner}
          eyebrow="SHERHOOD BASKET"
          title={fallbackName}
          subtitle="Fractional Sherd pools on Robinhood Chain"
        />
      ),
      { ...OG_SIZE }
    )
  }

  const subtitle =
    pot.status === 0
      ? `$${pot.totalDepositedFmt} / $${pot.fundingGoalFmt} · ${pot.progressPct.toFixed(0)}% funded · ${deadlineLabel(pot.deadline)}`
      : pot.holdings.length > 0
        ? `${pot.statusLabel} · ${pot.holdings.join(" + ")}`
        : pot.statusLabel
  const topHoldings =
    pot.holdings.length > 0
      ? pot.holdings.slice(0, 4).join(" · ")
      : "Multi-stock basket"

  return new ImageResponse(
    (
      <OgFrame
        banner={banner}
        eyebrow="SHERHOOD BASKET"
        title={pot.name}
        subtitle={subtitle}
        badge={pot.statusLabel.toUpperCase()}
        footer={`${pot.participantCount} funders · ${topHoldings} · sherhood.xyz`}
      />
    ),
    { ...OG_SIZE }
  )
}
