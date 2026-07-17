import type { MetadataRoute } from "next"
import { DOCS_NAV } from "@/lib/docs"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sherhood.xyz"
  const docs = DOCS_NAV.map((d) => ({
    url: `${base}${d.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/app`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/inventory`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/marketplace`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/create`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/profile`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/legal/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    ...docs,
  ]
}
