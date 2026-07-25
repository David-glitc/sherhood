import type { Metadata, Viewport } from "next"
import { Poppins, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ClientProviders } from "@/components/client-providers"
import { Header } from "@/components/layout/header"
import { SoftSiteFooter } from "@/components/layout/soft-site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  buildPageMetadata,
} from "@/lib/seo"
import { SHERHOOD_TAGLINE } from "@/lib/protocol"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "optional",
  preload: true,
  adjustFontFallback: true,
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "optional",
  preload: false,
  adjustFontFallback: true,
})

export const viewport: Viewport = {
  themeColor: "#ccff00",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: `${SITE_NAME} — ${SHERHOOD_TAGLINE}`,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  keywords: [
    "Sherhood",
    "Sherds",
    "Robinhood Chain",
    "Sherd pools",
    "fractional stocks",
    "USDG",
    "NFT ownership cards",
    "mystery cards",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "finance",
  icons: {
    icon: [
      { url: "/logo-mark-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-mark-192.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/logo-mark-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  other: {
    "theme-color": "#ccff00",
  },
}

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-mark-192.png`,
  sameAs: ["https://t.me/sherhoodhub", "https://x.com/sherhood_xyz"],
  description: SITE_DESCRIPTION,
}

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/app`,
    "query-input": "required name=search_term_string",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col bg-black font-sans text-white">
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-100 -translate-y-20 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <ClientProviders>
          <div className="flex min-h-dvh flex-1 flex-col">
            <Header />
            <main id="main-content" className="site-main flex min-h-[calc(100dvh-4.25rem)] flex-1 flex-col">
              {children}
            </main>
            <SoftSiteFooter />
          </div>
        </ClientProviders>
        <Toaster />
      </body>
    </html>
  )
}
