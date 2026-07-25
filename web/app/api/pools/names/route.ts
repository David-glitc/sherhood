import { NextResponse } from "next/server"
import { getAddress, isAddress } from "viem"
import { getPoolNamesMap, setPoolName } from "@/lib/pool-names-store"
import { mongoConfigured } from "@/lib/mongo"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const names = await getPoolNamesMap()
    return NextResponse.json({ names })
  } catch (e) {
    return NextResponse.json(
      { names: {}, error: e instanceof Error ? e.message : "failed" },
      { status: 200 }
    )
  }
}

type Body = { address?: string; name?: string; creator?: string }

export async function POST(request: Request) {
  if (!mongoConfigured()) {
    return NextResponse.json({ error: "Names store offline" }, { status: 503 })
  }
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.address || !isAddress(body.address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }
  const name = (body.name || "").trim()
  if (name.length < 2 || name.length > 48) {
    return NextResponse.json({ error: "Name must be 2–48 characters" }, { status: 400 })
  }
  try {
    await setPoolName(
      getAddress(body.address),
      name,
      body.creator && isAddress(body.creator) ? body.creator : undefined
    )
    return NextResponse.json({ ok: true, address: getAddress(body.address), name })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "save failed" },
      { status: 500 }
    )
  }
}
