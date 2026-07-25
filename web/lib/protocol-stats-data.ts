export type ProtocolStatsData = {
  pools: { total: number; live: number; processing: number; ended: number; cancelled?: number }
  cards: { active: string }
  users: { uniqueDepositors: string }
  volume: { fundingTvlFmt: string; lifetimeFeesFmt?: string }
  revenue?: { lifetimeFeesFmt: string; feeWallet: string }
}

import {
  potAbi,
  potCardConfig,
  potFactoryConfig,
  TREASURY_ADDRESS,
  TREASURY_FEE_WALLET,
} from "@/lib/contracts"
import { rhPublicClient } from "@/lib/rh-public-client"
import { POT_STATUSES, usdgToDollars } from "@/hooks/use-pots"
import { treasuryRevenueAbi } from "@/lib/treasury-revenue"

function fmtUsdAmount(value: bigint): string {
  const dollars = usdgToDollars(value)
  const digits = dollars > 0 && dollars < 1 ? 4 : 2
  return dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

function fmtUsdg(value: bigint): string {
  return usdgToDollars(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })
}

type PoolBucket = "live" | "processing" | "ended" | "cancelled"

function bucket(status: number, deadline: bigint, now: number): PoolBucket {
  if (status === 0) {
    return Number(deadline) > now ? "live" : "processing"
  }
  if (status === 1 || status === 2) return "processing"
  if (status === 4) return "cancelled"
  return "ended"
}

export type ProtocolStatsPayload = ProtocolStatsData & {
  volume: ProtocolStatsData["volume"] & {
    totalDepositedUsdg: string
    totalDepositedFmt: string
    fundingTvlUsdg: string
    lifetimeFeesUsdg: string
  }
  revenue: {
    lifetimeFeesUsdg: string
    lifetimeFeesFmt: string
    treasury: string
    feeWallet: string
  }
  cards: ProtocolStatsData["cards"] & { minted: string; burned: string }
  users: ProtocolStatsData["users"] & { deposits: string }
  note: string
  statusLabels: typeof POT_STATUSES
}

/** Shared on-chain protocol stats (TVL + lifetime fees). */
export async function loadProtocolStats(): Promise<ProtocolStatsPayload | null> {
  const factory = potFactoryConfig.address
  const card = potCardConfig.address
  if (factory === "0x0000000000000000000000000000000000000000") return null

  try {
    const now = Math.floor(Date.now() / 1000)

    const [protocol, minted, burned, supply, addresses, treasuryOnFactory] =
      await Promise.all([
        rhPublicClient.readContract({
          address: factory,
          abi: potFactoryConfig.abi,
          functionName: "protocolStats",
          args: [],
        }) as Promise<readonly [bigint, bigint, bigint, bigint]>,
        card !== "0x0000000000000000000000000000000000000000"
          ? (rhPublicClient.readContract({
              address: card,
              abi: potCardConfig.abi,
              functionName: "totalMinted",
              args: [],
            }) as Promise<bigint>)
          : Promise.resolve(0n),
        card !== "0x0000000000000000000000000000000000000000"
          ? (rhPublicClient.readContract({
              address: card,
              abi: potCardConfig.abi,
              functionName: "totalBurned",
              args: [],
            }) as Promise<bigint>)
          : Promise.resolve(0n),
        card !== "0x0000000000000000000000000000000000000000"
          ? (rhPublicClient.readContract({
              address: card,
              abi: potCardConfig.abi,
              functionName: "totalSupply",
              args: [],
            }) as Promise<bigint>)
          : Promise.resolve(0n),
        rhPublicClient.readContract({
          address: factory,
          abi: potFactoryConfig.abi,
          functionName: "getPots",
          args: [],
        }) as Promise<`0x${string}`[]>,
        rhPublicClient
          .readContract({
            address: factory,
            abi: potFactoryConfig.abi,
            functionName: "treasury",
            args: [],
          })
          .catch(() => TREASURY_ADDRESS) as Promise<`0x${string}`>,
      ])

    const treasuryAddr =
      treasuryOnFactory &&
      treasuryOnFactory !== "0x0000000000000000000000000000000000000000"
        ? treasuryOnFactory
        : TREASURY_ADDRESS

    let lifetimeFeesUsdg = 0n
    let feeRecipient: `0x${string}` = TREASURY_FEE_WALLET
    try {
      const [forwarded, collected, recipient] = await Promise.all([
        rhPublicClient
          .readContract({
            address: treasuryAddr,
            abi: treasuryRevenueAbi,
            functionName: "feesForwardedUSDG",
          })
          .catch(() => null),
        rhPublicClient
          .readContract({
            address: treasuryAddr,
            abi: treasuryRevenueAbi,
            functionName: "feesCollectedUSDG",
          })
          .catch(() => null),
        rhPublicClient
          .readContract({
            address: treasuryAddr,
            abi: treasuryRevenueAbi,
            functionName: "feeRecipient",
          })
          .catch(() => TREASURY_FEE_WALLET),
      ])
      if (typeof forwarded === "bigint") lifetimeFeesUsdg = forwarded
      else if (typeof collected === "bigint") lifetimeFeesUsdg = collected
      if (typeof recipient === "string") feeRecipient = recipient as `0x${string}`
    } catch {
      /* optional */
    }

    const [pools, depositVolume, deposits, users] = protocol

    let live = 0
    let processing = 0
    let ended = 0
    let cancelled = 0
    let fundingTvl = 0n

    await Promise.all(
      addresses.map(async (address) => {
        const [statusR, depositedR, deadlineR, claimCountR, participantCountR] =
          await Promise.all([
            rhPublicClient.readContract({
              address,
              abi: potAbi,
              functionName: "status",
            }),
            rhPublicClient.readContract({
              address,
              abi: potAbi,
              functionName: "totalDeposited",
            }),
            rhPublicClient.readContract({
              address,
              abi: potAbi,
              functionName: "deadline",
            }),
            rhPublicClient.readContract({
              address,
              abi: potAbi,
              functionName: "claimCount",
            }),
            rhPublicClient.readContract({
              address,
              abi: potAbi,
              functionName: "participantCount",
            }),
          ])
        const status = Number(statusR as bigint)
        const deposited = depositedR as bigint
        const deadline = deadlineR as bigint
        const claimCount = claimCountR as bigint
        const participantCount = participantCountR as bigint
        const b = bucket(status, deadline, now)
        if (b === "live") {
          live += 1
          fundingTvl += deposited
        } else if (b === "processing") {
          processing += 1
          if (status === 1) fundingTvl += deposited
          if (status === 2 && participantCount > claimCount) {
            fundingTvl +=
              participantCount === 0n
                ? 0n
                : (deposited * (participantCount - claimCount)) / participantCount
          }
        } else if (b === "cancelled") cancelled += 1
        else {
          ended += 1
          if (status === 3 && participantCount > claimCount) {
            fundingTvl +=
              participantCount === 0n
                ? 0n
                : (deposited * (participantCount - claimCount)) / participantCount
          }
        }
      })
    )

    const lifetimeFeesFmt = fmtUsdAmount(lifetimeFeesUsdg)

    return {
      pools: {
        total: Number(pools),
        live,
        processing,
        ended,
        cancelled,
      },
      cards: {
        minted: minted.toString(),
        burned: burned.toString(),
        active: supply.toString(),
      },
      users: {
        uniqueDepositors: users.toString(),
        deposits: deposits.toString(),
      },
      volume: {
        totalDepositedUsdg: depositVolume.toString(),
        totalDepositedFmt: fmtUsdg(depositVolume),
        fundingTvlUsdg: fundingTvl.toString(),
        fundingTvlFmt: fmtUsdg(fundingTvl),
        lifetimeFeesUsdg: lifetimeFeesUsdg.toString(),
        lifetimeFeesFmt,
      },
      revenue: {
        lifetimeFeesUsdg: lifetimeFeesUsdg.toString(),
        lifetimeFeesFmt,
        treasury: treasuryAddr,
        feeWallet: feeRecipient,
      },
      note:
        "fundingTvl = live Funding USDG + Closed pre-purchase USDG + book value of unclaimed Purchased/Revealed pots. lifetimeFees = TreasuryDirect.feesForwardedUSDG.",
      statusLabels: POT_STATUSES,
    }
  } catch {
    return null
  }
}
