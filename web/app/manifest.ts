import type { MetadataRoute } from "next"
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#050806",
    theme_color: "#ccff00",
    icons: [
      {
        src: "/logo-mark-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand-lockup-hood.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
