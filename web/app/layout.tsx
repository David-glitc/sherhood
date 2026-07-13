import type { Metadata } from "next"
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ClientProviders } from "@/components/client-providers"
import { Header } from "@/components/layout/header"

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Sherhood — Fractional Asset Loot on Robinhood Chain",
  description:
    "Join investment pots, mint mystery cards, reveal your fractional ownership of real Stock Tokens. Pay with ETH, WETH, or USDG.",
  metadataBase: new URL("https://sherhood.online"),
  openGraph: {
    title: "Sherhood",
    description: "Own a slice of the pot. Reveal decides how much.",
    url: "https://sherhood.online",
    siteName: "Sherhood",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Sherhood" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sherhood",
    description: "Fractional Asset Loot Protocol on Robinhood Chain.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  other: { "theme-color": "#7CFF6B" },
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#070a08] font-sans text-zinc-100">
        <ClientProviders>
          <Header />
          <main className="flex-1">{children}</main>
        </ClientProviders>
        <Toaster />
      </body>
    </html>
  )
}
