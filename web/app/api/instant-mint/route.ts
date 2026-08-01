import { NextResponse } from "next/server"
import {
  createWalletClient,
  createPublicClient,
  http,
  getAddress,
  isAddress,
  parseEventLogs,
  verifyMessage,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { robinhood } from "@/lib/chain"
import { potFactoryConfig } from "@/lib/contracts"
import { usdgAmountFromDollars } from "@/lib/usdg"
import {
  INSTANT_MINT_DURATION_HOURS,
  instantMintMessage,
  isInstantMintAmount,
} from "@/lib/instant-mint"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000

type Body = {
  minter?: string
  amountUsd?: number
  name?: string
  issuedAt?: number
  signature?: string
}

/**
 * Deployer creates a solo micro-vault (goal = min = amountUsd, entry fee 0).
 * Minter then deposits the full goal and ops advance closes → buys → reveals.
 * No $5 create fee — gas paid by deployer.
 */
export async function POST(request: Request) {
  const pk =
    process.env.SPONSOR_PRIVATE_KEY ||
    process.env.DEPLOYER_PRIVATE_KEY ||
    ""
  if (!pk) {
    return NextResponse.json(
      { error: "Instant mint is not configured" },
      { status: 503 }
    )
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.minter || !isAddress(body.minter)) {
    return NextResponse.json({ error: "Invalid minter" }, { status: 400 })
  }
  const amountUsd = Number(body.amountUsd)
  if (!isInstantMintAmount(amountUsd)) {
    return NextResponse.json(
      { error: "Amount must be $1.50 or $2.00" },
      { status: 400 }
    )
  }
  const name = (body.name || "").trim()
  if (name.length < 2 || name.length > 48) {
    return NextResponse.json({ error: "Name must be 2–48 characters" }, { status: 400 })
  }
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

  const minter = getAddress(body.minter)
  const message = instantMintMessage({
    minter,
    amountUsd,
    name,
    issuedAt: body.issuedAt,
  })
  let valid = false
  try {
    valid = await verifyMessage({
      address: minter,
      message,
      signature: body.signature as `0x${string}`,
    })
  } catch {
    valid = false
  }
  if (!valid) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 })
  }

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
      { error: "Deployer key is not the factory owner" },
      { status: 503 }
    )
  }

  const bal = await publicClient.getBalance({ address: account.address })
  if (bal < 50_000_000_000_000n) {
    // ~0.00005 ETH — RH gas is cheap but dust balances brick create
    return NextResponse.json(
      {
        error:
          "Ops wallet needs gas — top up deployer with ~0.001 ETH on Robinhood Chain",
      },
      { status: 503 }
    )
  }

  const goalUnits = usdgAmountFromDollars(amountUsd, "instantMint")

  try {
    const hash = await walletClient.writeContract({
      address: potFactoryConfig.address,
      abi: potFactoryConfig.abi,
      functionName: "createPot",
      args: [
        goalUnits,
        BigInt(INSTANT_MINT_DURATION_HOURS * 3600),
        goalUnits, // min = full goal → one deposit fills
        0n, // no entry fee on Instant Mint
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
    if (!pot) {
      return NextResponse.json(
        { error: "Pool created but address not found in receipt", hash },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      hash,
      pot,
      minter,
      amountUsd,
      name,
      onChainCreator: account.address,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "createPot failed"
    return NextResponse.json({ error: msg.slice(0, 220) }, { status: 500 })
  }
}
