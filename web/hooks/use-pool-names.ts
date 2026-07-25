"use client"

import { useEffect } from "react"
import { registerNamedPools } from "@/lib/basket-name"

/** Load Mongo/API pool display names into the client name cache. */
export function usePoolNamesHydration() {
  useEffect(() => {
    let alive = true
    fetch("/api/pools/names")
      .then((r) => (r.ok ? r.json() : { names: {} }))
      .then((json: { names?: Record<string, string> }) => {
        if (!alive || !json.names) return
        registerNamedPools(json.names)
      })
      .catch(() => {
        /* offline */
      })
    return () => {
      alive = false
    }
  }, [])
}
