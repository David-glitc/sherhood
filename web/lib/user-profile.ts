/**
 * Off-chain display profiles (unique name + avatar + receive opt-in). SIWE via /api/profiles.
 */

export const PROFILE_AVATAR_COUNT = 10
export const PROFILE_NAME_MAX = 24
export const PROFILE_NAME_MIN = 2

export type UserProfile = {
  address: string
  name: string
  /** URL slug derived from name — unique across profiles. */
  slug: string
  avatarId: number
  /** When true, wallet address is available for sends. */
  allowReceive: boolean
  updatedAt: number
}

/** Public-facing profile — address omitted unless allowReceive. */
export type PublicUserProfile = {
  address?: string
  name: string
  slug: string
  avatarId: number
  allowReceive: boolean
  updatedAt: number
}

export const PROFILE_AVATARS = [
  { id: 0, src: "/avatars/hood-01.svg?v=2", label: "Archer" },
  { id: 1, src: "/avatars/hood-02.svg?v=2", label: "Star Scout" },
  { id: 2, src: "/avatars/hood-03.svg?v=2", label: "Mask" },
  { id: 3, src: "/avatars/hood-04.svg?v=2", label: "Spade" },
  { id: 4, src: "/avatars/hood-05.svg?v=2", label: "Horns" },
  { id: 5, src: "/avatars/hood-06.svg?v=2", label: "Quiver" },
  { id: 6, src: "/avatars/hood-07.svg?v=2", label: "Owl" },
  { id: 7, src: "/avatars/hood-08.svg?v=2", label: "Rogue" },
  { id: 8, src: "/avatars/hood-09.svg?v=2", label: "Crown" },
  { id: 9, src: "/avatars/hood-10.svg?v=2", label: "Fox" },
] as const

export function avatarSrc(avatarId: number): string {
  const id = Number.isFinite(avatarId)
    ? Math.max(0, Math.min(PROFILE_AVATAR_COUNT - 1, Math.floor(avatarId)))
    : 0
  return PROFILE_AVATARS[id].src
}

/** Stable URL slug from display name (unique key). */
export function profileSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

export function normalizeProfileName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim()
  if (name.length < PROFILE_NAME_MIN || name.length > PROFILE_NAME_MAX) return null
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(name)) return null
  const slug = profileSlug(name)
  if (slug.length < PROFILE_NAME_MIN) return null
  return name
}

export function defaultAvatarId(address: string): number {
  const hex = address.toLowerCase().replace(/^0x/, "")
  const n = parseInt(hex.slice(0, 8), 16)
  return Number.isFinite(n) ? n % PROFILE_AVATAR_COUNT : 0
}

export function profileStorageKey(address: string): string {
  return `sherhood.profile.${address.toLowerCase()}`
}

export function toPublicProfile(profile: UserProfile): PublicUserProfile {
  const slug = profile.slug || profileSlug(profile.name)
  return {
    name: profile.name,
    slug,
    avatarId: profile.avatarId,
    allowReceive: Boolean(profile.allowReceive),
    updatedAt: profile.updatedAt,
    ...(profile.allowReceive ? { address: profile.address.toLowerCase() } : {}),
  }
}

export function readLocalProfile(address: string): UserProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(profileStorageKey(address))
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserProfile
    if (!parsed?.name || typeof parsed.avatarId !== "number") return null
    return {
      address: address.toLowerCase(),
      name: parsed.name,
      slug: parsed.slug || profileSlug(parsed.name),
      avatarId: parsed.avatarId,
      allowReceive: Boolean(parsed.allowReceive),
      updatedAt: parsed.updatedAt ?? Date.now(),
    }
  } catch {
    return null
  }
}

export function writeLocalProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return
  localStorage.setItem(profileStorageKey(profile.address), JSON.stringify(profile))
}

/** Message signed to prove wallet ownership when saving a profile. */
export function profileSignMessage(input: {
  address: string
  name: string
  avatarId: number
  allowReceive: boolean
  updatedAt: number
}): string {
  return [
    "Sherhood Profile",
    `Address: ${input.address.toLowerCase()}`,
    `Name: ${input.name}`,
    `Avatar: ${input.avatarId}`,
    `AllowReceive: ${input.allowReceive ? "yes" : "no"}`,
    `Updated: ${input.updatedAt}`,
  ].join("\n")
}

  /** Message signed to prove wallet ownership when deleting account data. */
export function profileDeleteMessage(input: {
  address: string
  updatedAt: number
}): string {
  return [
    "Sherhood Delete Account",
    `Address: ${input.address.toLowerCase()}`,
    `Updated: ${input.updatedAt}`,
  ].join("\n")
}

/** Public profile URL by unique name slug. */
export function profilePath(nameOrProfile: string | { name: string; slug?: string }): string {
  if (typeof nameOrProfile === "string") {
    const slug = profileSlug(nameOrProfile)
    return `/u/${slug || nameOrProfile.toLowerCase()}`
  }
  const slug = nameOrProfile.slug || profileSlug(nameOrProfile.name)
  return `/u/${slug}`
}
