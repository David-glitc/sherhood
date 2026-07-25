import { ImageResponse } from "next/og"
import { SHERHOOD_TAGLINE } from "@/lib/protocol"
import { loadBrandBanner, OG_SIZE, OgFrame } from "@/lib/og-frame"

export const runtime = "nodejs"
export const alt = "Sherhood — Collect stocks like gacha cards"
export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image() {
  const banner = await loadBrandBanner()
  return new ImageResponse(
    (
      <OgFrame
        banner={banner}
        title="Sherhood"
        subtitle={SHERHOOD_TAGLINE}
        badge="BASKETS · SHERDS"
        footer="sherhood.xyz · Robinhood Chain"
      />
    ),
    { ...OG_SIZE }
  )
}
