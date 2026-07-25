"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { isMarketingPath } from "@/lib/marketing-path"

type WalletBootContextValue = {
  ready: boolean
  requestBoot: () => void
}

const WalletBootContext = createContext<WalletBootContextValue>({
  ready: true,
  requestBoot: () => {},
})

export function useWalletBoot() {
  return useContext(WalletBootContext)
}

export function WalletBootProvider({
  children,
  onBoot,
}: {
  children: ReactNode
  onBoot?: () => void
}) {
  const pathname = usePathname() || "/"
  const marketing = isMarketingPath(pathname)
  const [ready, setReady] = useState(!marketing)

  const requestBoot = useCallback(() => {
    setReady(true)
    onBoot?.()
  }, [onBoot])

  useEffect(() => {
    if (!marketing) {
      setReady(true)
      return
    }
    // Already booted (user interacted) — keep ready across soft navigations.
    if (ready) return

    let cancelled = false
    const boot = () => {
      if (!cancelled) setReady(true)
    }

    const onInteract = () => boot()
    window.addEventListener("pointerdown", onInteract, { once: true, passive: true })
    window.addEventListener("keydown", onInteract, { once: true })

    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(boot, { timeout: 4000 })
    } else {
      timeoutId = setTimeout(boot, 2800)
    }

    return () => {
      cancelled = true
      window.removeEventListener("pointerdown", onInteract)
      window.removeEventListener("keydown", onInteract)
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [marketing, ready])

  const value = useMemo(() => ({ ready, requestBoot }), [ready, requestBoot])

  return <WalletBootContext.Provider value={value}>{children}</WalletBootContext.Provider>
}
