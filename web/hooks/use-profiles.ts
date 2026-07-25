"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { UserProfile } from "@/lib/user-profile"
import {
  defaultAvatarId,
  readLocalProfile,
  writeLocalProfile,
} from "@/lib/user-profile"

type ProfileMap = Record<string, UserProfile>

function mergeLocal(map: ProfileMap, addresses: string[]): ProfileMap {
  const next = { ...map }
  for (const addr of addresses) {
    const local = readLocalProfile(addr)
    if (!local) continue
    const key = addr.toLowerCase()
    const remote = next[key]
    if (!remote || local.updatedAt >= remote.updatedAt) {
      next[key] = local
    }
  }
  return next
}

/** Batch-load display profiles for wallet addresses. */
export function useProfiles(addresses: (string | undefined | null)[]) {
  const keys = useMemo(() => {
    const set = new Set<string>()
    for (const a of addresses) {
      if (a && /^0x[a-fA-F0-9]{40}$/.test(a)) set.add(a.toLowerCase())
    }
    return Array.from(set).sort()
  }, [addresses])

  const keySig = keys.join(",")
  const [map, setMap] = useState<ProfileMap>({})

  useEffect(() => {
    if (keys.length === 0) {
      setMap({})
      return
    }

    let cancelled = false
    const localFirst = mergeLocal({}, keys)
    setMap(localFirst)

    const controller = new AbortController()
    fetch(`/api/profiles?addresses=${encodeURIComponent(keys.join(","))}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((json: { profiles?: UserProfile[] }) => {
        if (cancelled) return
        setMap((prev) => {
          // Mongo/remote wins when present; keep local only as fill for missing keys
          const next = { ...prev }
          for (const p of json.profiles ?? []) {
            next[p.address.toLowerCase()] = p
            writeLocalProfile(p)
          }
          return next
        })
      })
      .catch(() => {
        if (!cancelled) setMap(mergeLocal({}, keys))
      })

    return () => {
      cancelled = true
      controller.abort()
    }
    // keySig captures keys contents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig])

  const get = useCallback(
    (address?: string | null): UserProfile | null => {
      if (!address) return null
      return map[address.toLowerCase()] ?? null
    },
    [map]
  )

  const displayName = useCallback(
    (address?: string | null, fallbackShort = true): string => {
      if (!address) return "—"
      const p = get(address)
      if (p?.name) return p.name
      if (!fallbackShort) return address
      return `${address.slice(0, 6)}…${address.slice(-4)}`
    },
    [get]
  )

  const avatarFor = useCallback(
    (address?: string | null): number => {
      if (!address) return 0
      const p = get(address)
      if (p) return p.avatarId
      return defaultAvatarId(address)
    },
    [get]
  )

  const upsertLocal = useCallback((profile: UserProfile) => {
    writeLocalProfile(profile)
    setMap((prev) => ({ ...prev, [profile.address.toLowerCase()]: profile }))
  }, [])

  return { map, get, displayName, avatarFor, upsertLocal }
}
