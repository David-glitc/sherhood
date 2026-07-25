import type { Metadata } from "next"
import { SHERHOOD_TAGLINE, SHERD_NAME } from "@/lib/protocol"

export const SITE_URL = "https://sherhood.xyz"
export const SITE_NAME = "Sherhood"
export const SITE_DESCRIPTION = `${SHERHOOD_TAGLINE}. Fund a stock basket on Robinhood Chain, mint a mystery ${SHERD_NAME}, reveal your fractional ownership. Pay with ETH, WETH, or USDG.`

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export function truncateMeta(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1).trimEnd()}…`
}

type BuildMetaInput = {
  title: string
  description: string
  path: string
  image?: string
  type?: "website" | "article"
  noIndex?: boolean
}

/** Shared metadata builder for static + dynamic routes. */
export function buildPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  noIndex = false,
}: BuildMetaInput): Metadata {
  const url = absoluteUrl(path)
  const ogImage = image ?? absoluteUrl("/opengraph-image")
  // Prefer dedicated twitter-image when callers pass an opengraph-image path
  const twitterImage = ogImage.includes("/opengraph-image")
    ? ogImage.replace("/opengraph-image", "/twitter-image")
    : ogImage
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`

  return {
    title: fullTitle,
    description: truncateMeta(description),
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description: truncateMeta(description),
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: truncateMeta(description),
      images: [{ url: twitterImage, width: 1200, height: 630, alt: title }],
      creator: "@sherhood_xyz",
      site: "@sherhood_xyz",
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  }
}
