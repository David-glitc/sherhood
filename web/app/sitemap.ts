import type { MetadataRoute } from "next"
import { DOCS_NAV } from "@/lib/docs"
import { SITE_URL } from "@/lib/seo"
import { listOpenPotAddresses } from "@/lib/share-data"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = DOCS_NAV.map((d) => ({
    url: `${SITE_URL}${d.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  let pools: MetadataRoute.Sitemap = []
  try {
    const open = await listOpenPotAddresses()
    pools = open.map((address) => ({
      url: `${SITE_URL}/pools/${address}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.85,
    }))
  } catch {
    pools = []
  }

  // Public indexable surfaces only — /profile, /inventory, /api, /buy-shrd are noindex via robots.
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/app`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
    {
      url: `${SITE_URL}/sherds`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/create`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/people`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/bridge`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${SITE_URL}/roadmap`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/deck`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${SITE_URL}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${SITE_URL}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.35,
    },
    { url: `${SITE_URL}/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    ...docs,
    ...pools,
  ]
}
