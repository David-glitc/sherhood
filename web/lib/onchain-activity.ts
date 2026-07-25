import { parseAbiItem, type Log } from "viem"
import {
  marketplaceConfig,
  potCardConfig,
  potFactoryConfig,
} from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { basketName } from "@/lib/basket-name"
import { allVisiblePots } from "@/lib/hidden-pots"
import { fmtUsdg } from "@/hooks/use-pots"
import { SITE_URL } from "@/lib/seo"
import { tgEscape } from "@/lib/tg"

const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://robinhoodchain.blockscout.com"

const potCreated = parseAbiItem(
  "event PotCreated(address indexed pot, address indexed creator, uint256 fundingGoal, uint256 deadline, uint256 minDeposit, uint256 entryFee, uint256 protocolFeeBps, bool community)"
)
const deposited = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 entryFeePaid, uint256 indexed tokenId)"
)
const claimed = parseAbiItem(
  "event Claimed(address indexed user, uint256 indexed tokenId, address[] tokens, uint256[] payouts)"
)
const earlyExited = parseAbiItem(
  "event EarlyExited(address indexed user, uint256 indexed tokenId, uint256 depositAmount, uint256 fee, uint256 refund)"
)
const closed = parseAbiItem("event Closed(uint256 totalDeposited, uint256 participantCount)")
const revealed = parseAbiItem("event Revealed()")
const purchased = parseAbiItem("event Purchased(address[] tokens, uint256[] amounts)")
const potCancelled = parseAbiItem(
  "event PotCancelled(uint256 totalDeposited, uint256 participantCount)"
)
const sold = parseAbiItem(
  "event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royalty)"
)
const listed = parseAbiItem(
  "event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)"
)
const listingCancelled = parseAbiItem(
  "event Cancelled(uint256 indexed tokenId, address indexed seller)"
)
const cardMinted = parseAbiItem(
  "event CardMinted(uint256 indexed tokenId, address indexed pot, address indexed to, uint256 depositAmount)"
)
const cardRevealed = parseAbiItem(
  "event CardRevealed(uint256 indexed tokenId, uint256 ownershipWeight, uint8 rarity)"
)
const transfer = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
)

export type ActivityKind =
  | "pool_created"
  | "funded"
  | "minted"
  | "claimed"
  | "early_exit"
  | "closed"
  | "revealed"
  | "purchased"
  | "cancelled"
  | "listed"
  | "delisted"
  | "sold"
  | "transfer"
  | "card_revealed"

export type ChainActivity = {
  kind: ActivityKind
  blockNumber: bigint
  txHash: string
  pot?: string
  message: string
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function txLink(hash: string) {
  return `${EXPLORER}/tx/${hash}`
}

function potLink(pot: string) {
  return `${SITE_URL}/pools/${pot}`
}

function sherdLink(id: string | number | bigint) {
  return `${SITE_URL}/sherds/${id}`
}

function addrLink(a: string) {
  return `${EXPLORER}/address/${a}`
}

function logMeta(log: Log) {
  return {
    blockNumber: log.blockNumber ?? 0n,
    txHash: log.transactionHash || "",
  }
}

/** Scan Sherhood contracts for activity in (fromBlock, toBlock]. */
export async function fetchChainActivity(
  fromBlock: bigint,
  toBlock: bigint
): Promise<ChainActivity[]> {
  if (toBlock <= fromBlock) return []

  const factory = potFactoryConfig.address
  const market = marketplaceConfig.address
  const card = potCardConfig.address
  const zero = "0x0000000000000000000000000000000000000000"
  const out: ChainActivity[] = []

  let pots: `0x${string}`[] = []
  if (factory !== zero) {
    try {
      pots = allVisiblePots(
        (await rhPublicClient.readContract({
          ...potFactoryConfig,
          functionName: "getPots",
          args: [],
        })) as `0x${string}`[]
      )
    } catch {
      pots = []
    }
  }

  const sample = pots.slice(-80)

  // Factory — pool created
  if (factory !== zero) {
    try {
      const logs = await rhPublicClient.getLogs({
        address: factory,
        event: potCreated,
        fromBlock: fromBlock + 1n,
        toBlock,
      })
      for (const log of logs) {
        const pot = (log.args as { pot?: string }).pot
        const creator = (log.args as { creator?: string }).creator
        const goal = (log.args as { fundingGoal?: bigint }).fundingGoal ?? 0n
        const community = Boolean((log.args as { community?: boolean }).community)
        if (!pot || !creator) continue
        const { blockNumber, txHash } = logMeta(log)
        const name = tgEscape(basketName(pot))
        out.push({
          kind: "pool_created",
          blockNumber,
          txHash,
          pot,
          message: [
            `<b>🆕 Sherd pool created</b>`,
            `${community ? "Community" : "Protocol"} · <b>${name}</b>`,
            `Goal <code>$${fmtUsdg(goal)}</code>`,
            `Creator <a href="${addrLink(creator)}">${short(creator)}</a>`,
            `<a href="${potLink(pot)}">Open pool</a> · <a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
    } catch {
      /* continue */
    }
  }

  // Per-pot events
  if (sample.length > 0) {
    const batches = await Promise.all(
      sample.map(async (pot) => {
        try {
          const [deps, claims, exits, closes, reveals, buys, cancels] = await Promise.all([
            rhPublicClient.getLogs({
              address: pot,
              event: deposited,
              fromBlock: fromBlock + 1n,
              toBlock,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: claimed,
              fromBlock: fromBlock + 1n,
              toBlock,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: earlyExited,
              fromBlock: fromBlock + 1n,
              toBlock,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: closed,
              fromBlock: fromBlock + 1n,
              toBlock,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: revealed,
              fromBlock: fromBlock + 1n,
              toBlock,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: purchased,
              fromBlock: fromBlock + 1n,
              toBlock,
            }),
            rhPublicClient.getLogs({
              address: pot,
              event: potCancelled,
              fromBlock: fromBlock + 1n,
              toBlock,
            }),
          ])
          return { pot, deps, claims, exits, closes, reveals, buys, cancels }
        } catch {
          return {
            pot,
            deps: [],
            claims: [],
            exits: [],
            closes: [],
            reveals: [],
            buys: [],
            cancels: [],
          }
        }
      })
    )

    for (const b of batches) {
      const name = tgEscape(basketName(b.pot))
      for (const log of b.deps) {
        const user = (log.args as { user?: string }).user
        const amount = (log.args as { amount?: bigint }).amount ?? 0n
        const tokenId = (log.args as { tokenId?: bigint }).tokenId
        if (!user) continue
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "funded",
          blockNumber,
          txHash,
          pot: b.pot,
          message: [
            `<b>💰 Pool funded</b>`,
            `<b>${name}</b> · <code>$${fmtUsdg(amount)}</code>`,
            `By <a href="${addrLink(user)}">${short(user)}</a>`,
            tokenId != null
              ? `Sherd <a href="${sherdLink(tokenId)}">#${tokenId}</a>`
              : "",
            `<a href="${potLink(b.pot)}">Pool</a> · <a href="${txLink(txHash)}">tx</a>`,
          ]
            .filter(Boolean)
            .join("\n"),
        })
      }
      for (const log of b.claims) {
        const user = (log.args as { user?: string }).user
        const tokenId = (log.args as { tokenId?: bigint }).tokenId
        if (!user) continue
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "claimed",
          blockNumber,
          txHash,
          pot: b.pot,
          message: [
            `<b>✅ Share claimed</b>`,
            `<b>${name}</b>`,
            `By <a href="${addrLink(user)}">${short(user)}</a>`,
            tokenId != null ? `Sherd #${tokenId}` : "",
            `<a href="${txLink(txHash)}">tx</a>`,
          ]
            .filter(Boolean)
            .join("\n"),
        })
      }
      for (const log of b.exits) {
        const user = (log.args as { user?: string }).user
        const refund = (log.args as { refund?: bigint }).refund ?? 0n
        if (!user) continue
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "early_exit",
          blockNumber,
          txHash,
          pot: b.pot,
          message: [
            `<b>🚪 Early exit</b>`,
            `<b>${name}</b> · refund <code>$${fmtUsdg(refund)}</code>`,
            `By <a href="${addrLink(user)}">${short(user)}</a>`,
            `<a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
      for (const log of b.closes) {
        const total = (log.args as { totalDeposited?: bigint }).totalDeposited ?? 0n
        const n = (log.args as { participantCount?: bigint }).participantCount ?? 0n
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "closed",
          blockNumber,
          txHash,
          pot: b.pot,
          message: [
            `<b>🔒 Pool closed</b>`,
            `<b>${name}</b>`,
            `Raised <code>$${fmtUsdg(total)}</code> · ${n.toString()} funders`,
            `<a href="${potLink(b.pot)}">Pool</a> · <a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
      for (const log of b.reveals) {
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "revealed",
          blockNumber,
          txHash,
          pot: b.pot,
          message: [
            `<b>✨ Pool revealed</b>`,
            `<b>${name}</b> — ownership weights assigned`,
            `<a href="${potLink(b.pot)}">Pool</a> · <a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
      for (const log of b.buys) {
        const tokens = (log.args as { tokens?: string[] }).tokens ?? []
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "purchased",
          blockNumber,
          txHash,
          pot: b.pot,
          message: [
            `<b>📈 Stocks purchased</b>`,
            `<b>${name}</b>`,
            tokens.length ? `${tokens.length} token(s) into vault` : "Vault filled",
            `<a href="${potLink(b.pot)}">Pool</a> · <a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
      for (const log of b.cancels) {
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "cancelled",
          blockNumber,
          txHash,
          pot: b.pot,
          message: [
            `<b>❌ Pool cancelled</b>`,
            `<b>${name}</b>`,
            `<a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
    }
  }

  // Marketplace
  if (market !== zero) {
    try {
      const [sales, lists, cancels] = await Promise.all([
        rhPublicClient.getLogs({
          address: market,
          event: sold,
          fromBlock: fromBlock + 1n,
          toBlock,
        }),
        rhPublicClient.getLogs({
          address: market,
          event: listed,
          fromBlock: fromBlock + 1n,
          toBlock,
        }),
        rhPublicClient.getLogs({
          address: market,
          event: listingCancelled,
          fromBlock: fromBlock + 1n,
          toBlock,
        }),
      ])
      for (const log of lists) {
        const seller = (log.args as { seller?: string }).seller
        const tokenId = (log.args as { tokenId?: bigint }).tokenId
        const price = (log.args as { price?: bigint }).price ?? 0n
        if (!seller || tokenId == null) continue
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "listed",
          blockNumber,
          txHash,
          message: [
            `<b>🏷️ Sherd listed</b>`,
            `<a href="${sherdLink(tokenId)}">#${tokenId}</a> · ask <code>$${fmtUsdg(price)}</code>`,
            `Seller <a href="${addrLink(seller)}">${short(seller)}</a>`,
            `<a href="${SITE_URL}/marketplace">Trade</a> · <a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
      for (const log of cancels) {
        const seller = (log.args as { seller?: string }).seller
        const tokenId = (log.args as { tokenId?: bigint }).tokenId
        if (!seller || tokenId == null) continue
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "delisted",
          blockNumber,
          txHash,
          message: [
            `<b>📭 Listing cancelled</b>`,
            `Sherd #${tokenId}`,
            `By <a href="${addrLink(seller)}">${short(seller)}</a>`,
            `<a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
      for (const log of sales) {
        const seller = (log.args as { seller?: string }).seller
        const buyer = (log.args as { buyer?: string }).buyer
        const tokenId = (log.args as { tokenId?: bigint }).tokenId
        const price = (log.args as { price?: bigint }).price ?? 0n
        if (!seller || !buyer || tokenId == null) continue
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "sold",
          blockNumber,
          txHash,
          message: [
            `<b>💸 Sherd sold</b>`,
            `<a href="${sherdLink(tokenId)}">#${tokenId}</a> · <code>$${fmtUsdg(price)}</code>`,
            `${short(seller)} → ${short(buyer)}`,
            `<a href="${SITE_URL}/marketplace">Trade</a> · <a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }
    } catch {
      /* continue */
    }
  }

  // PotCard mint + reveal + peer transfers
  if (card !== zero) {
    try {
      const [mints, reveals, transfers] = await Promise.all([
        rhPublicClient.getLogs({
          address: card,
          event: cardMinted,
          fromBlock: fromBlock + 1n,
          toBlock,
        }),
        rhPublicClient.getLogs({
          address: card,
          event: cardRevealed,
          fromBlock: fromBlock + 1n,
          toBlock,
        }),
        rhPublicClient.getLogs({
          address: card,
          event: transfer,
          fromBlock: fromBlock + 1n,
          toBlock,
        }),
      ])

      // Prefer Deposited messages for funding; CardMinted is redundant unless we want dual.
      // Skip CardMinted when we already have Deposited for same token in this batch — keep mint as backup label only if no deposit.
      // Simpler: skip CardMinted entirely (deposit already says Sherd #id). Keep CardRevealed + Transfer.

      for (const log of reveals) {
        const tokenId = (log.args as { tokenId?: bigint }).tokenId
        const weight = (log.args as { ownershipWeight?: bigint }).ownershipWeight
        if (tokenId == null) continue
        const { blockNumber, txHash } = logMeta(log)
        const pct =
          weight != null
            ? `${(Number((weight * 10000n) / 10n ** 18n) / 100).toFixed(2)}`
            : "?"
        out.push({
          kind: "card_revealed",
          blockNumber,
          txHash,
          message: [
            `<b>🎴 Sherd revealed</b>`,
            `<a href="${sherdLink(tokenId)}">#${tokenId}</a> · ${pct}% ownership`,
            `<a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }

      for (const log of transfers) {
        const from = (log.args as { from?: string }).from
        const to = (log.args as { to?: string }).to
        const tokenId = (log.args as { tokenId?: bigint }).tokenId
        if (!from || !to || tokenId == null) continue
        // Skip mints (from zero) and burns (to zero) — covered elsewhere / noise
        if (from === zero || to === zero) continue
        // Skip marketplace escrow hops if market is involved? Still useful as transfer.
        const { blockNumber, txHash } = logMeta(log)
        out.push({
          kind: "transfer",
          blockNumber,
          txHash,
          message: [
            `<b>↔️ Sherd transfer</b>`,
            `<a href="${sherdLink(tokenId)}">#${tokenId}</a>`,
            `${short(from)} → ${short(to)}`,
            `<a href="${txLink(txHash)}">tx</a>`,
          ].join("\n"),
        })
      }

      void mints // reserved if we want mint-only broadcasts later
    } catch {
      /* continue */
    }
  }

  out.sort((a, b) => {
    if (a.blockNumber === b.blockNumber) return a.txHash.localeCompare(b.txHash)
    return a.blockNumber < b.blockNumber ? -1 : 1
  })

  return out
}
