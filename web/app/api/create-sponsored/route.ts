import { NextResponse } from "next/server"
import {
  createWalletClient,
  createPublicClient,
  http,
  formatUnits,
  getAddress,
  isAddress,
  parseEventLogs,
  verifyMessage,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { robinhood } from "@/lib/chain"
import { potFactoryConfig, ERC20_ABI, SHRH_ADDRESS } from "@/lib/contracts"
import { PROTOCOL_DEFAULTS } from "@/lib/basket-stocks"
import { SHRH_CREATE_WAIVER_USD } from "@/lib/create-fee"
import { SHRH_LAUNCHED } from "@/lib/protocol"
import { usdgAmountFromDollars, usdgAmountFromDollarsOrZero } from "@/lib/usdg"

export const dynamic = "force-dynamic"

type Body = {
  creator: string
  fundingGoal: string
  durationHours: string
  minDeposit: string
  issuedAt: number
  signature: string
}

/** Message the requestor signs to prove they control `creator` (binds params + freshness). */
export function sponsoredCreateMessage(b: {
  creator: string
  fundingGoal: string
  durationHours: string
  minDeposit: string
  issuedAt: number
}): string {
  return [
    "Sherhood sponsored create",
    `creator: ${b.creator}`,
    `fundingGoal: ${b.fundingGoal}`,
    `durationHours: ${b.durationHours}`,
    `minDeposit: ${b.minDeposit}`,
    `issuedAt: ${b.issuedAt}`,
  ].join("\n")
}

const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000 // 10 minutes

/**
 * $SHRH holders (≥ $500 mark): deployer opens the basket via createPot (owner, no fee).
 * No factory upgrade — creator on-chain is the deployer; the requestor is recorded in the response.
 */
export async function POST(request: Request) {
  const pk =
    process.env.SPONSOR_PRIVATE_KEY ||
    process.env.DEPLOYER_PRIVATE_KEY ||
    ""
  if (!pk) {
    return NextResponse.json(
      { error: "Sponsored create is not configured" },
      { status: 503 }
    )
  }

  if (!SHRH_LAUNCHED) {
    return NextResponse.json(
      { error: "$SHRH is not live yet — sponsored create unlocks at launch" },
      { status: 400 }
    )
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isAddress(body.creator)) {
    return NextResponse.json({ error: "Invalid creator address" }, { status: 400 })
  }

  // Proof of control: the requestor must sign this exact request. Without it, anyone could
  // satisfy the $SHRH gate below by naming a whale's address they don't own.
  if (!body.signature || typeof body.signature !== "string") {
    return NextResponse.json({ error: "signature required" }, { status: 400 })
  }
  if (
    typeof body.issuedAt !== "number" ||
    !Number.isFinite(body.issuedAt) ||
    Math.abs(Date.now() - body.issuedAt) > SIGNATURE_MAX_AGE_MS
  ) {
    return NextResponse.json({ error: "stale or missing issuedAt" }, { status: 400 })
  }
  {
    const message = sponsoredCreateMessage({
      creator: body.creator,
      fundingGoal: body.fundingGoal,
      durationHours: body.durationHours,
      minDeposit: body.minDeposit,
      issuedAt: body.issuedAt,
    })
    let valid = false
    try {
      valid = await verifyMessage({
        address: getAddress(body.creator),
        message,
        signature: body.signature as `0x${string}`,
      })
    } catch {
      valid = false
    }
    if (!valid) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 })
    }
  }

  const hours = Math.floor(Number(body.durationHours))
  const goal = Number(body.fundingGoal)
  const min = Number(body.minDeposit)
  if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
    return NextResponse.json({ error: "Duration must be 1–720 hours" }, { status: 400 })
  }
  if (!Number.isFinite(goal) || goal <= 0) {
    return NextResponse.json({ error: "Invalid funding goal" }, { status: 400 })
  }
  if (!Number.isFinite(min) || min <= 0 || min > goal) {
    return NextResponse.json({ error: "Invalid min deposit" }, { status: 400 })
  }

  const requestor = getAddress(body.creator)
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`
  )
  const transport = http(
    process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"
  )
  const publicClient = createPublicClient({ chain: robinhood, transport })
  const walletClient = createWalletClient({
    account,
    chain: robinhood,
    transport,
  })

  const owner = (await publicClient.readContract({
    address: potFactoryConfig.address,
    abi: potFactoryConfig.abi,
    functionName: "owner",
  })) as `0x${string}`
  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    return NextResponse.json(
      { error: "Sponsor key is not the factory owner" },
      { status: 503 }
    )
  }

  const bal = (await publicClient.readContract({
    address: SHRH_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [requestor],
  })) as bigint

  const markUsd = Number(formatUnits(bal, 18))
  if (markUsd < SHRH_CREATE_WAIVER_USD) {
    return NextResponse.json(
      {
        error: `Need ≥ $${SHRH_CREATE_WAIVER_USD} of $SHRH (got ~$${markUsd.toFixed(2)})`,
      },
      { status: 403 }
    )
  }

  try {
    // Existing owner path — no createFor / no redeploy
    const hash = await walletClient.writeContract({
      address: potFactoryConfig.address,
      abi: potFactoryConfig.abi,
      functionName: "createPot",
      args: [
        usdgAmountFromDollars(Number(body.fundingGoal), "fundingGoal"),
        BigInt(hours * 3600),
        usdgAmountFromDollars(Number(body.minDeposit), "minDeposit"),
        usdgAmountFromDollarsOrZero(Number(PROTOCOL_DEFAULTS.entryFeeUsdg), "entryFee"),
        0n,
      ],
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    const logs = parseEventLogs({
      abi: potFactoryConfig.abi,
      eventName: "PotCreated",
      logs: receipt.logs,
    }) as { args: { pot?: `0x${string}` } }[]
    const pot = logs[logs.length - 1]?.args?.pot

    return NextResponse.json({
      ok: true,
      hash,
      pot,
      requestor,
      onChainCreator: account.address,
      shrhMarkUsd: markUsd,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "createPot failed"
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 })
  }
}
