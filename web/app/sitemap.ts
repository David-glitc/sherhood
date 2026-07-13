import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://sherwood.packs",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://sherwood.packs/inventory",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://sherwood.packs/telegram",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]
}
