"use client"

import { useCallback, useEffect, useState } from "react"
import type { OpenSeaListingRow } from "@/app/api/opensea/listings/route"

export function useOpenSeaListings(enabled = true) {
  const [listings, setListings] = useState<OpenSeaListingRow[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const res = await fetch("/api/opensea/listings", {
        signal,
        cache: "no-store",
      })
      const json = (await res.json()) as {
        listings?: OpenSeaListingRow[]
        error?: string
      }
      setListings(json.listings ?? [])
      setError(json.error ?? null)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "failed")
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [enabled, refresh])

  const byTokenId = useCallback(
    (tokenId: string | bigint) =>
      listings.find((l) => l.tokenId === String(tokenId)) ?? null,
    [listings]
  )

  return { listings, loading, error, refresh, byTokenId }
}
