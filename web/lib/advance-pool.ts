import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  getAddress,
  type Address,
  type Hex,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { robinhood } from "@/lib/chain"
import { potAbi, potFactoryConfig } from "@/lib/contracts"

/** Pot.Status */
export const POT_STATUS = {
  Funding: 0,
  Closed: 1,
  Purchased: 2,
  Revealed: 3,
  Cancelled: 4,
} as const

const ASSET_MANAGER_ABI = [
  {
    type: "function",
    name: "purchaseWithSeed",
    inputs: [
      { name: "pot", type: "address" },
      { name: "seed", type: "uint256" },
      { name: "pickCount", type: "uint256" },
      { name: "amountOutMinimum", type: "uint256" },
    ],
    outputs: [{ name: "amountsOut", type: "uint256[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "seededPurchaseEnabled",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const

const REVEAL_ENGINE_ABI = [
  {
    // Request randomness from the coordinator. The reveal seed is bound to a future
    // blockhash (see PrevRandaoCoordinator), NOT a caller-supplied / time-based value, so a
    // participant cannot grind the reveal to inflate their own ownership share.
    type: "function",
    name: "requestReveal",
    inputs: [{ name: "pot", type: "address" }],
    outputs: [{ name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revealRequested",
    inputs: [{ name: "pot", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "potRequestId",
    inputs: [{ name: "pot", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vrfCoordinator",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const

const COORDINATOR_ABI = [
  {
    type: "function",
    name: "fulfill",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const

export type AdvanceStep =
  | "closed"
  | "purchased"
  | "reveal_requested"
  | "revealed"
  | "fees_swept"
  | "skipped"
  | "noop"

export type AdvanceResult = {
  pot: string
  statusBefore: number
  statusAfter: number
  steps: AdvanceStep[]
  txHashes: string[]
  message?: string
}

function rpcUrl() {
  return process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"
}

function opsAccount() {
  const pk =
    process.env.SPONSOR_PRIVATE_KEY ||
    process.env.DEPLOYER_PRIVATE_KEY ||
    process.env.OPS_PRIVATE_KEY ||
    ""
  if (!pk) return null
  return privateKeyToAccount((pk.startsWith("0x") ? pk : `0x${pk}`) as Hex)
}

function clients() {
  const transport = http(rpcUrl())
  const publicClient = createPublicClient({ chain: robinhood, transport })
  const account = opsAccount()
  const walletClient = account
    ? createWalletClient({ account, chain: robinhood, transport })
    : null
  return { publicClient, walletClient, account }
}

function seedFor(pot: Address, label: string): bigint {
  return BigInt(
    keccak256(encodePacked(["address", "string", "uint256"], [pot, label, BigInt(Date.now())]))
  )
}

async function readStatus(
  publicClient: ReturnType<typeof createPublicClient>,
  pot: Address
): Promise<number> {
  return Number(
    await publicClient.readContract({
      address: pot,
      abi: potAbi,
      functionName: "status",
    })
  )
}

/** Close → purchase (seeded) → reveal (allocateWithSeed). Ops key required past close. */
export async function advancePool(potRaw: string): Promise<AdvanceResult> {
  const pot = getAddress(potRaw) as Address
  const { publicClient, walletClient, account } = clients()
  const steps: AdvanceStep[] = []
  const txHashes: string[] = []

  const statusBefore = await readStatus(publicClient, pot)
  let status = statusBefore

  if (status === POT_STATUS.Revealed || status === POT_STATUS.Cancelled) {
    return {
      pot,
      statusBefore,
      statusAfter: status,
      steps: ["noop"],
      txHashes,
      message: status === POT_STATUS.Revealed ? "Already revealed" : "Pool cancelled",
    }
  }

  // Funding → close when goal met or deadline passed (permissionless; ops can do it).
  if (status === POT_STATUS.Funding) {
    const [goal, deadline, total, count] = await Promise.all([
      publicClient.readContract({ address: pot, abi: potAbi, functionName: "fundingGoal" }),
      publicClient.readContract({ address: pot, abi: potAbi, functionName: "deadline" }),
      publicClient.readContract({ address: pot, abi: potAbi, functionName: "totalDeposited" }),
      publicClient.readContract({ address: pot, abi: potAbi, functionName: "participantCount" }),
    ])
    const now = BigInt(Math.floor(Date.now() / 1000))
    const ready =
      (total as bigint) >= (goal as bigint) || now >= (deadline as bigint)
    if (!ready) {
      return {
        pot,
        statusBefore,
        statusAfter: status,
        steps: ["skipped"],
        txHashes,
        message: "Still funding",
      }
    }
    if ((count as bigint) === 0n) {
      return {
        pot,
        statusBefore,
        statusAfter: status,
        steps: ["skipped"],
        txHashes,
        message: "Empty pool",
      }
    }
    if (!walletClient || !account) {
      return {
        pot,
        statusBefore,
        statusAfter: status,
        steps: ["skipped"],
        txHashes,
        message: "Ops key not configured — connect a wallet and Seal vault on the pool page",
      }
    }
    const hash = await walletClient.writeContract({
      address: pot,
      abi: potAbi,
      functionName: "close",
      account,
      chain: robinhood,
    })
    await publicClient.waitForTransactionReceipt({ hash })
    txHashes.push(hash)
    steps.push("closed")
    status = await readStatus(publicClient, pot)
  }

  if (!walletClient || !account) {
    return {
      pot,
      statusBefore,
      statusAfter: status,
      steps: steps.length ? steps : ["skipped"],
      txHashes,
      message: "Ops key not configured for purchase/reveal",
    }
  }

  const [assetManager, revealEngine] = await Promise.all([
    publicClient.readContract({
      ...potFactoryConfig,
      functionName: "assetManager",
    }) as Promise<Address>,
    publicClient.readContract({
      ...potFactoryConfig,
      functionName: "revealEngine",
    }) as Promise<Address>,
  ])

  if (status === POT_STATUS.Closed) {
    const seeded = await publicClient.readContract({
      address: assetManager,
      abi: ASSET_MANAGER_ABI,
      functionName: "seededPurchaseEnabled",
    })
    if (!seeded) {
      return {
        pot,
        statusBefore,
        statusAfter: status,
        steps: [...steps, "skipped"],
        txHashes,
        message: "Seeded purchase disabled — run commit/purchase manually",
      }
    }
    const hash = await walletClient.writeContract({
      address: assetManager,
      abi: ASSET_MANAGER_ABI,
      functionName: "purchaseWithSeed",
      args: [pot, seedFor(pot, "purchase"), 3n, 0n],
      account,
      chain: robinhood,
    })
    await publicClient.waitForTransactionReceipt({ hash })
    txHashes.push(hash)
    steps.push("purchased")
    status = await readStatus(publicClient, pot)
  }

  if (status === POT_STATUS.Purchased) {
    const requested = await publicClient.readContract({
      address: revealEngine,
      abi: REVEAL_ENGINE_ABI,
      functionName: "revealRequested",
      args: [pot],
    })
    if (!requested) {
      // Phase 1: request randomness. The coordinator binds the seed to a future blockhash;
      // the reveal itself finalizes a few blocks later via fulfill() below.
      const hash = await walletClient.writeContract({
        address: revealEngine,
        abi: REVEAL_ENGINE_ABI,
        functionName: "requestReveal",
        args: [pot],
        account,
        chain: robinhood,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      txHashes.push(hash)
      steps.push("reveal_requested")
      return {
        pot,
        statusBefore,
        statusAfter: await readStatus(publicClient, pot),
        steps,
        txHashes,
        message: "Reveal requested — randomness finalizes in a few blocks, then advance again",
      }
    }
    // Phase 2: randomness was requested earlier; try to finalize it via the coordinator.
    // fulfill() reverts ("too early") until the target block passes, so this is retried on a
    // later advance call (frontend auto-retry / cron) — it is never caller-timed.
    const [coordinator, requestId] = await Promise.all([
      publicClient.readContract({
        address: revealEngine,
        abi: REVEAL_ENGINE_ABI,
        functionName: "vrfCoordinator",
      }) as Promise<Address>,
      publicClient.readContract({
        address: revealEngine,
        abi: REVEAL_ENGINE_ABI,
        functionName: "potRequestId",
        args: [pot],
      }) as Promise<bigint>,
    ])
    try {
      const hash = await walletClient.writeContract({
        address: coordinator,
        abi: COORDINATOR_ABI,
        functionName: "fulfill",
        args: [requestId],
        account,
        chain: robinhood,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      txHashes.push(hash)
      steps.push("revealed")
      status = await readStatus(publicClient, pot)
    } catch {
      return {
        pot,
        statusBefore,
        statusAfter: status,
        steps: [...steps, "skipped"],
        txHashes,
        message: "Randomness not ready yet — try again shortly",
      }
    }
  }

  // Forward entry + protocol fees to treasury after purchase/reveal when owed.
  if (status === POT_STATUS.Purchased || status === POT_STATUS.Revealed) {
    try {
      const [owed, swept] = await Promise.all([
        publicClient.readContract({
          address: pot,
          abi: potAbi,
          functionName: "feesOwed",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: pot,
          abi: potAbi,
          functionName: "feesSwept",
        }) as Promise<bigint>,
      ])
      if (owed > swept) {
        const hash = await walletClient.writeContract({
          address: pot,
          abi: potAbi,
          functionName: "sweepFees",
          account,
          chain: robinhood,
        })
        await publicClient.waitForTransactionReceipt({ hash })
        txHashes.push(hash)
        steps.push("fees_swept")
      }
    } catch {
      /* non-fatal — fees can be swept later */
    }
  }

  return {
    pot,
    statusBefore,
    statusAfter: status,
    steps: steps.length ? steps : ["noop"],
    txHashes,
  }
}

/** Scan recent factory pots and advance any that are past funding / closed / purchased. */
export async function advanceAllReadyPots(limit = 40): Promise<{
  scanned: number
  results: AdvanceResult[]
}> {
  const { publicClient } = clients()
  const pots = (await publicClient.readContract({
    ...potFactoryConfig,
    functionName: "getPots",
    args: [],
  })) as Address[]

  const sample = pots.slice(-limit)
  const results: AdvanceResult[] = []

  for (const pot of sample) {
    try {
      const status = await readStatus(publicClient, pot)
      if (
        status === POT_STATUS.Funding ||
        status === POT_STATUS.Closed ||
        status === POT_STATUS.Purchased
      ) {
        // Only attempt funding pots that are actually ready (advancePool checks).
        const result = await advancePool(pot)
        if (result.steps.some((s) => s !== "noop" && s !== "skipped") || result.message) {
          results.push(result)
        }
      }
    } catch (e) {
      results.push({
        pot,
        statusBefore: -1,
        statusAfter: -1,
        steps: ["skipped"],
        txHashes: [],
        message: e instanceof Error ? e.message : "advance failed",
      })
    }
  }

  return { scanned: sample.length, results }
}
