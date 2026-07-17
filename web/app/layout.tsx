import type { Metadata } from "next"
import { Poppins, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ClientProviders } from "@/components/client-providers"
import { Header } from "@/components/layout/header"
import { SiteFooter } from "@/components/layout/page-shell"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Sherhood — Baskets on Robinhood Chain",
  description:
    "Fund a stock basket, mint a mystery card, reveal your fractional ownership. Pay with ETH, WETH, or USDG.",
  metadataBase: new URL("https://sherhood.xyz"),
  openGraph: {
    title: "Sherhood",
    description: "Fund baskets. Mint cards. Reveal how much you own.",
    url: "https://sherhood.xyz",
    siteName: "Sherhood",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Sherhood" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sherhood",
    description: "Fractional stock baskets on Robinhood Chain.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo-mark-192.png",
    shortcut: "/logo-mark-192.png",
    apple: "/apple-touch-icon.png",
  },
  other: { "theme-color": "#ccff00" },
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-black font-sans text-white">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-100 -translate-y-20 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <ClientProviders>
          <Header />
          <main id="main-content" className="site-main flex-1">{children}</main>
          <SiteFooter />
        </ClientProviders>
        <Toaster />
      </body>
    </html>
  )
}
