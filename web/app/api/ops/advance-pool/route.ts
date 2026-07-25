import { NextResponse } from "next/server"
import { isAddress } from "viem"
import { advancePool } from "@/lib/advance-pool"

export const dynamic = "force-dynamic"
export const maxDuration = 120

type Body = { pot?: string }

/**
 * Advance one pool: close (if ready) → seeded purchase → allocateWithSeed reveal.
 * Uses DEPLOYER/SPONSOR/OPS private key for purchase/reveal.
 * Close is also permissionless from the pool page wallet.
 */
export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.pot || !isAddress(body.pot)) {
    return NextResponse.json({ error: "Invalid pot address" }, { status: 400 })
  }

  try {
    const result = await advancePool(body.pot)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Advance failed" },
      { status: 500 }
    )
  }
}
