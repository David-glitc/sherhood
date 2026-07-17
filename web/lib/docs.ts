export type DocNavItem = {
  href: string
  title: string
  description: string
}

export const DOCS_NAV: DocNavItem[] = [
  {
    href: "/docs/getting-started",
    title: "Getting started",
    description: "Connect, fund a basket, mint a card",
  },
  {
    href: "/docs/protocol",
    title: "Protocol",
    description: "Baskets, multi-stock buy, cards, reveal",
  },
  {
    href: "/docs/allocation",
    title: "Allocation",
    description: "Ownership weights, rarity, $SHRH boost",
  },
  {
    href: "/docs/pricing",
    title: "Pricing",
    description: "Derived value and fixed-price listings",
  },
  {
    href: "/docs/early-exit",
    title: "Early exit",
    description: "Exit windows, fees, haircuts",
  },
  {
    href: "/docs/secondary-market",
    title: "Secondary market",
    description: "Mystery vs revealed, listing locks",
  },
  {
    href: "/docs/opensea",
    title: "OpenSea",
    description: "Collection metadata and royalties",
  },
  {
    href: "/docs/fees",
    title: "Fees",
    description: "Create fee, exit fee, trade royalty",
  },
  {
    href: "/docs/xp",
    title: "XP & streaks",
    description: "Points, daily streaks, leaderboard",
  },
]

export function docsMeta(title: string, description: string) {
  return {
    title: `${title} · Sherhood Docs`,
    description,
  }
}
