"use client"

import dynamic from "next/dynamic"

const HeroOrbitLogos = dynamic(
  () =>
    import("@/components/landing/hero-orbit-logos").then((m) => m.HeroOrbitLogos),
  { ssr: false, loading: () => null }
)

/** Client slot so the server HeroPrism can defer orbit logos. */
export function HeroOrbitSlot() {
  return <HeroOrbitLogos />
}
