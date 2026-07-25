import type { MetadataRoute } from "next"

/** Crawl policy for sherhood.xyz — keep private/API surfaces out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/profile",
          "/inventory",
          "/buy-shrd",
          "/share/",
          "/telegram",
        ],
      },
    ],
    sitemap: "https://sherhood.xyz/sitemap.xml",
    host: "https://sherhood.xyz",
  }
}
