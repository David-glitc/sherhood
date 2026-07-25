import { isAddress, getAddress, formatUnits } from "viem"
import { potAbi, potCardConfig, potFactoryConfig } from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { basketName } from "@/lib/basket-name"
import { allVisiblePots } from "@/lib/hidden-pots"
import {
  POT_STATUSES,
  RARITIES,
  fmtUsdg,
  fmtTokenAmount,
  ownershipPct,
  rarityIndexFromOwnership,
} from "@/hooks/use-pots"
import { stockByAddress } from "@/lib/basket-stocks"
import { cardImageUrl, rarityKeyFromIndex } from "@/lib/card-art"
import { getProfile } from "@/lib/profile-store"
export type PotShareData = {
  address: `0x${string}`
  name: string
  status: number
  statusLabel: string
  deadline: bigint
  fundingGoalFmt: string
  totalDepositedFmt: string
  progressPct: number
  participantCount: number
  holdings: string[]
  description: string
  pagePath: string
}

export type SherdAssetRow = {
  symbol: string
  amountFmt: string
  token: `0x${string}`
}

export type SherdShareData = {
  tokenId: string
  pot: `0x${string}`
  potName: string
  revealed: boolean
  claimed: boolean
  rarityLabel: string
  rarityIndex: number
  ownershipPct: string
  depositFmt: string
  holdings: string[]
  assets: SherdAssetRow[]
  owner: `0x${string}`
  ownerLabel: string
  ownerName?: string
  ownerSlug?: string
  image: string
  description: string
  pagePath: string
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export async function fetchPotShareData(raw: string): Promise<PotShareData | null> {
  if (!isAddress(raw)) return null
  const address = getAddress(raw)

  try {
    const [fundingGoal, status, deadline, totalDeposited, participantCount, progressBps, holdingsRaw] =
      await rhPublicClient.multicall({
        contracts: [
          { address, abi: potAbi, functionName: "fundingGoal" },
          { address, abi: potAbi, functionName: "status" },
          { address, abi: potAbi, functionName: "deadline" },
          { address, abi: potAbi, functionName: "totalDeposited" },
          { address, abi: potAbi, functionName: "participantCount" },
          { address, abi: potAbi, functionName: "fundingProgressBps" },
          { address, abi: potAbi, functionName: "getHoldings" },
        ],
        allowFailure: true,
      })

    if (
      fundingGoal.status !== "success" ||
      status.status !== "success" ||
      deadline.status !== "success"
    ) {
      return null
    }

    const statusNum = Number(status.result)
    const goal = fundingGoal.result as bigint
    const deposited =
      totalDeposited.status === "success" ? (totalDeposited.result as bigint) : 0n
    const progress =
      progressBps.status === "success"
        ? Math.min(100, Number(progressBps.result as bigint) / 100)
        : 0
    const participants =
      participantCount.status === "success" ? Number(participantCount.result as bigint) : 0

    const holdings: string[] = []
    if (holdingsRaw.status === "success") {
      const tokens = (holdingsRaw.result as readonly [`0x${string}`[], bigint[]])[0]
      for (const token of tokens) {
        holdings.push(stockByAddress(token)?.symbol ?? shortAddr(token))
      }
    }

    const name = basketName(address)
    const statusLabel = POT_STATUSES[statusNum] ?? "Unknown"
    const holdingLine = holdings.length > 0 ? holdings.join(" + ") : "multi-stock"
    const description =
      statusNum === 0
        ? `${name} is live on Sherhood. $${fmtUsdg(deposited)} of $${fmtUsdg(goal)} raised (${progress.toFixed(0)}%). Fund with ETH, WETH, or USDG to mint a mystery Sherd.`
        : holdings.length > 0
          ? `${name} · ${statusLabel}. Vault holds ${holdingLine}. Open on Sherhood to fund, trade, or claim.`
          : `${name} · ${statusLabel} on Robinhood Chain. Open on Sherhood to mint or claim Sherds.`

    return {
      address,
      name,
      status: statusNum,
      statusLabel,
      deadline: deadline.result as bigint,
      fundingGoalFmt: fmtUsdg(goal),
      totalDepositedFmt: fmtUsdg(deposited),
      progressPct: progress,
      participantCount: participants,
      holdings,
      description,
      pagePath: `/pools/${address}`,
    }
  } catch {
    return null
  }
}

export async function fetchSherdShareData(id: string): Promise<SherdShareData | null> {
  if (!/^\d+$/.test(id)) return null
  const tokenId = BigInt(id)
  const cardAddress = potCardConfig.address
  if (cardAddress === "0x0000000000000000000000000000000000000000") return null

  try {
    const card = (await rhPublicClient.readContract({
      address: cardAddress,
      abi: potCardConfig.abi,
      functionName: "getCard",
      args: [tokenId],
    })) as {
      pot: `0x${string}`
      depositAmount: bigint
      ownershipWeight: bigint
      rarity: number
      revealed: boolean
      claimed: boolean
    }

    if (card.pot === "0x0000000000000000000000000000000000000000") return null

    const rarityIdx = card.revealed
      ? card.rarity >= 1 && card.rarity <= 4
        ? Number(card.rarity)
        : rarityIndexFromOwnership(card.ownershipWeight)
      : 0
    const rarityKey = card.revealed ? rarityKeyFromIndex(rarityIdx) : "unrevealed"
    const rarityLabel =
      rarityKey === "unrevealed"
        ? "Sealed"
        : (RARITIES[rarityIdx] ?? rarityKey.charAt(0).toUpperCase() + rarityKey.slice(1))

    const depositUsdg = Number(
      card.depositAmount >= 10n ** 15n
        ? formatUnits(card.depositAmount, 18)
        : formatUnits(card.depositAmount, 6)
    )
    const weightPct = ownershipPct(card.ownershipWeight)
    const potName = basketName(card.pot)

    let owner: `0x${string}` = "0x0000000000000000000000000000000000000000"
    const ownerLabel = shortAddr(owner)

    try {
      owner = (await rhPublicClient.readContract({
        address: cardAddress,
        abi: potCardConfig.abi,
        functionName: "ownerOf",
        args: [tokenId],
      })) as `0x${string}`
    } catch {
      /* burned / missing */
    }

    let ownerName: string | undefined
    let ownerSlug: string | undefined
    if (owner !== "0x0000000000000000000000000000000000000000") {
      try {
        const profile = await getProfile(owner)
        if (profile?.name) {
          ownerName = profile.name
          ownerSlug = profile.slug
        }
      } catch {
        /* mongo optional */
      }
    }

    let holdings: string[] = []
    let assets: SherdAssetRow[] = []
    if (card.revealed) {
      try {
        const raw = (await rhPublicClient.readContract({
          address: card.pot,
          abi: potAbi,
          functionName: "getHoldings",
        })) as readonly [`0x${string}`[], bigint[]]
        holdings = raw[0].map((t) => stockByAddress(t)?.symbol ?? shortAddr(t))
        assets = raw[0].map((token, i) => {
          const symbol = stockByAddress(token)?.symbol ?? shortAddr(token)
          const vaultAmt = raw[1][i] ?? 0n
          const shareAmt = (vaultAmt * card.ownershipWeight) / 10n ** 18n
          return {
            symbol,
            token,
            amountFmt: fmtTokenAmount(shareAmt),
          }
        })
      } catch {
        holdings = []
        assets = []
      }
    }

    const holdingLine = holdings.join(" + ")
    const description = card.revealed
      ? `Sherd #${id} from ${potName} — ${rarityLabel}, ${weightPct}% ownership${
          holdingLine ? ` of ${holdingLine}` : ""
        }. Collect stocks like gacha cards on Sherhood.`
      : `Sealed Sherd #${id} from ${potName}. Ownership % and rarity unlock when the basket reveals.`

    return {
      tokenId: id,
      pot: card.pot,
      potName,
      revealed: card.revealed,
      claimed: card.claimed,
      rarityLabel,
      rarityIndex: rarityIdx,
      ownershipPct: weightPct,
      depositFmt: depositUsdg.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      holdings,
      assets,
      owner,
      ownerLabel,
      ownerName,
      ownerSlug,
      image: cardImageUrl(rarityIdx, card.revealed),
      description,
      pagePath: `/sherds/${id}`,
    }
  } catch {
    return null
  }
}

/** Open pots for sitemap (best-effort; empty on RPC failure). */
export async function listOpenPotAddresses(): Promise<`0x${string}`[]> {
  const factory = potFactoryConfig.address
  if (factory === "0x0000000000000000000000000000000000000000") return []

  try {
    const addresses = allVisiblePots(
      (await rhPublicClient.readContract({
        address: factory,
        abi: potFactoryConfig.abi,
        functionName: "getPots",
        args: [],
      })) as `0x${string}`[]
    )

    const statuses = await rhPublicClient.multicall({
      contracts: addresses.map((address) => ({
        address,
        abi: potAbi,
        functionName: "status" as const,
      })),
      allowFailure: true,
    })

    return addresses.filter((_, i) => {
      const row = statuses[i]
      return row.status === "success" && Number(row.result) === 0
    })
  } catch {
    return []
  }
}
