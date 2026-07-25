import { NextResponse } from "next/server"
import { isAddress, verifyMessage } from "viem"
import { deleteAccountData } from "@/lib/xp-store"
import {
  getProfile,
  getProfiles,
  isNameAvailable,
  listPublicProfiles,
  listReceivers,
  resolveProfileParam,
  upsertProfile,
} from "@/lib/profile-store"
import {
  normalizeProfileName,
  profileSignMessage,
  profileDeleteMessage,
  PROFILE_AVATAR_COUNT,
  toPublicProfile,
} from "@/lib/user-profile"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("mode")

  if (mode === "directory") {
    const profiles = await listPublicProfiles(100)
    return NextResponse.json(
      { profiles },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
    )
  }

  if (mode === "receivers") {
    const receivers = await listReceivers(100)
    return NextResponse.json(
      { receivers },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
    )
  }

  if (mode === "check-name") {
    const name = searchParams.get("name") || ""
    const owner = searchParams.get("address") || undefined
    const available = await isNameAvailable(name, owner)
    return NextResponse.json({ available, name: normalizeProfileName(name) })
  }

  const handle = searchParams.get("slug") || searchParams.get("name")
  if (handle && searchParams.get("public") === "1") {
    const row = await resolveProfileParam(handle)
    if (!row) return NextResponse.json({ profile: null }, { status: 404 })
    // wallet always returned for on-chain inventory (NFT ownership is public).
    // profile.address still gated by allowReceive for Send / explorer chrome.
    return NextResponse.json({
      profile: toPublicProfile(row),
      wallet: row.address.toLowerCase(),
    })
  }

  const one = searchParams.get("address")
  if (one && isAddress(one) && searchParams.get("public") === "1") {
    const row = await getProfile(one)
    if (!row) return NextResponse.json({ profile: null }, { status: 404 })
    return NextResponse.json({ profile: toPublicProfile(row) })
  }

  const raw = searchParams.get("addresses") || one || ""
  const addresses = raw
    .split(",")
    .map((a) => a.trim())
    .filter((a) => isAddress(a))
    .slice(0, 100)

  if (addresses.length === 0) {
    return NextResponse.json({ profiles: [] })
  }

  const profiles = await getProfiles(addresses)
  return NextResponse.json(
    { profiles },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } }
  )
}

export async function PUT(request: Request) {
  let body: {
    address?: string
    name?: string
    avatarId?: number
    allowReceive?: boolean
    updatedAt?: number
    signature?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const address = body.address?.trim()
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? normalizeProfileName(body.name) : null
  if (!name) {
    return NextResponse.json(
      { error: "Name must be 2–24 letters, numbers, spaces, _ . -" },
      { status: 400 }
    )
  }

  const avatarId = Number(body.avatarId)
  if (!Number.isInteger(avatarId) || avatarId < 0 || avatarId >= PROFILE_AVATAR_COUNT) {
    return NextResponse.json({ error: "invalid avatar" }, { status: 400 })
  }

  const allowReceive = Boolean(body.allowReceive)

  const updatedAt = Number(body.updatedAt)
  if (!Number.isFinite(updatedAt) || Math.abs(Date.now() - updatedAt) > 15 * 60_000) {
    return NextResponse.json({ error: "stale timestamp" }, { status: 400 })
  }

  const signature = body.signature
  if (!signature || typeof signature !== "string") {
    return NextResponse.json({ error: "signature required" }, { status: 400 })
  }

  const message = profileSignMessage({
    address,
    name,
    avatarId,
    allowReceive,
    updatedAt,
  })

  let valid = false
  try {
    valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
  } catch {
    valid = false
  }

  if (!valid) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 })
  }

  try {
    const profile = await upsertProfile({
      address,
      name,
      avatarId,
      allowReceive,
      updatedAt,
    })
    return NextResponse.json({ profile })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "save failed" },
      { status: 400 }
    )
  }
}

/** Signed wipe of off-chain account data (profile, XP cache, activity cache). */
export async function DELETE(request: Request) {
  let body: {
    address?: string
    updatedAt?: number
    signature?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const address = body.address?.trim()
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 })
  }

  const updatedAt = Number(body.updatedAt)
  if (!Number.isFinite(updatedAt) || Math.abs(Date.now() - updatedAt) > 15 * 60_000) {
    return NextResponse.json({ error: "stale timestamp" }, { status: 400 })
  }

  const signature = body.signature
  if (!signature || typeof signature !== "string") {
    return NextResponse.json({ error: "signature required" }, { status: 400 })
  }

  const message = profileDeleteMessage({ address, updatedAt })

  let valid = false
  try {
    valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
  } catch {
    valid = false
  }

  if (!valid) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 })
  }

  try {
    await deleteAccountData(address)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 }
    )
  }
}
