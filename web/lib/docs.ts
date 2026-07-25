export type DocNavItem = {
  href: string
  title: string
  description: string
}

export const DOCS_NAV: DocNavItem[] = [
  {
    href: "/docs/getting-started",
    title: "Getting started",
    description: "Fund your first Sherd pool",
  },
  {
    href: "/docs/protocol",
    title: "How Sherhood works",
    description: "The pool and card journey",
  },
  {
    href: "/docs/allocation",
    title: "Reveal and rarity",
    description: "Read your revealed card",
  },
  {
    href: "/docs/pricing",
    title: "Card value",
    description: "Compare value and asking price",
  },
  {
    href: "/docs/early-exit",
    title: "Exits and refunds",
    description: "Leave funding or recover a refund",
  },
  {
    href: "/docs/positions",
    title: "Positions and claims",
    description: "Hold indefinitely, mark growth, claim rules",
  },
  {
    href: "/docs/secondary-market",
    title: "Buying and selling",
    description: "List, buy, and cancel a sale",
  },
  {
    href: "/docs/opensea",
    title: "OpenSea",
    description: "Use the official external collection",
  },
  {
    href: "/docs/fees",
    title: "Fees",
    description: "Funding, creation, exit, and trade fees",
  },
  {
    href: "/docs/xp",
    title: "XP & streaks",
    description: "Points, daily streaks, leaderboard",
  },
  {
    href: "/docs/shrh",
    title: "$SHERD",
    description: "Hold for luck and create perks",
  },
  {
    href: "/docs/v2",
    title: "Sherhood V2",
    description: "Product + distribution roadmap",
  },
]

export function docsMeta(title: string, description: string) {
  return {
    title: `${title} · Sherhood Docs`,
    description,
  }
}
