import { isAddress } from "viem"
import type { Db, Collection } from "mongodb"
import { getDb, mongoConfigured } from "@/lib/mongo"
import type { UserProfile } from "@/lib/user-profile"
import { normalizeProfileName, PROFILE_AVATAR_COUNT, profileSlug } from "@/lib/user-profile"

type ProfileDoc = UserProfile & { _id?: string }

declare global {
  // eslint-disable-next-line no-var
  var __sherhoodProfileIndexes: Promise<void> | undefined
}

function normalizeRow(raw: Partial<UserProfile>, key: string): UserProfile {
  const name = raw.name || ""
  return {
    address: (raw.address || key).toLowerCase(),
    name,
    slug: raw.slug || profileSlug(name),
    avatarId: typeof raw.avatarId === "number" ? raw.avatarId : 0,
    allowReceive: Boolean(raw.allowReceive),
    updatedAt: raw.updatedAt ?? 0,
  }
}

async function profilesCol(): Promise<Collection<ProfileDoc>> {
  const db: Db = await getDb()
  const col = db.collection<ProfileDoc>("profiles")
  if (!globalThis.__sherhoodProfileIndexes) {
    globalThis.__sherhoodProfileIndexes = (async () => {
      await Promise.all([
        col.createIndex({ address: 1 }, { unique: true }),
        col.createIndex({ slug: 1 }, { unique: true, sparse: true }),
        col.createIndex({ allowReceive: 1, updatedAt: -1 }),
        col.createIndex({ updatedAt: -1 }),
      ])
    })().catch(() => {
      /* index races across cold starts are fine */
    })
  }
  await globalThis.__sherhoodProfileIndexes
  return col
}

export async function getProfiles(addresses: string[]): Promise<UserProfile[]> {
  if (!mongoConfigured() || addresses.length === 0) return []
  const keys = addresses.map((a) => a.toLowerCase())
  const col = await profilesCol()
  const rows = await col.find({ address: { $in: keys } }).toArray()
  const byAddr = new Map(rows.map((r) => [r.address.toLowerCase(), normalizeRow(r, r.address)]))
  return keys.map((k) => byAddr.get(k)).filter((p): p is UserProfile => Boolean(p))
}

export async function getProfile(address: string): Promise<UserProfile | null> {
  if (!mongoConfigured()) return null
  const col = await profilesCol()
  const row = await col.findOne({ address: address.toLowerCase() })
  return row ? normalizeRow(row, address) : null
}

export async function getProfileBySlug(slugRaw: string): Promise<UserProfile | null> {
  const slug = profileSlug(decodeURIComponent(slugRaw))
  if (!slug || !mongoConfigured()) return null
  const col = await profilesCol()
  const row = await col.findOne({ slug })
  return row ? normalizeRow(row, row.address) : null
}

/** Resolve /u/[slug] — name slug first, then wallet address fallback. */
export async function resolveProfileParam(param: string): Promise<UserProfile | null> {
  const decoded = decodeURIComponent(param).trim()
  if (isAddress(decoded)) return getProfile(decoded)
  return getProfileBySlug(decoded)
}

export async function isNameAvailable(name: string, ownerAddress?: string): Promise<boolean> {
  const cleaned = normalizeProfileName(name)
  if (!cleaned) return false
  const slug = profileSlug(cleaned)
  const existing = await getProfileBySlug(slug)
  if (!existing) return true
  if (ownerAddress && existing.address.toLowerCase() === ownerAddress.toLowerCase()) return true
  return false
}

/** Profiles that opted in to receive — full address included for send UX. */
export async function listReceivers(limit = 100): Promise<UserProfile[]> {
  if (!mongoConfigured()) return []
  const col = await profilesCol()
  const rows = await col
    .find({ allowReceive: true, name: { $exists: true, $ne: "" } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()
  return rows.map((r) => normalizeRow(r, r.address))
}

export async function listPublicProfiles(limit = 100): Promise<UserProfile[]> {
  if (!mongoConfigured()) return []
  const col = await profilesCol()
  const rows = await col
    .find({ name: { $exists: true, $ne: "" } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()
  return rows.map((r) => normalizeRow(r, r.address))
}

export async function upsertProfile(input: {
  address: string
  name: string
  avatarId: number
  allowReceive: boolean
  updatedAt: number
}): Promise<UserProfile> {
  if (!mongoConfigured()) {
    throw new Error("Profile storage unavailable — MONGODB_URI missing")
  }

  const name = normalizeProfileName(input.name)
  if (!name) throw new Error("Invalid name")
  if (
    !Number.isInteger(input.avatarId) ||
    input.avatarId < 0 ||
    input.avatarId >= PROFILE_AVATAR_COUNT
  ) {
    throw new Error("Invalid avatar")
  }

  const slug = profileSlug(name)
  const addr = input.address.toLowerCase()
  const col = await profilesCol()

  const clash = await col.findOne({
    slug,
    address: { $ne: addr },
  })
  if (clash) throw new Error("That name is already taken")

  const profile: UserProfile = {
    address: addr,
    name,
    slug,
    avatarId: input.avatarId,
    allowReceive: Boolean(input.allowReceive),
    updatedAt: input.updatedAt,
  }

  await col.updateOne(
    { address: addr },
    { $set: profile },
    { upsert: true }
  )

  return profile
}
