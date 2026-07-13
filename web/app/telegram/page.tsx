"use client"

import { useEffect } from "react"
import { RaffleApp } from "@/components/raffle/raffle-app"

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: { setText: (text: string) => void; show: () => void; hide: () => void }
        initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string } }
        colorScheme: string
      }
    }
  }
}

export default function TelegramPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
      document.documentElement.className = "h-full antialiased bg-black"
    }
  }, [])

  return (
    <div className="mx-auto max-w-md px-3 py-4">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-robinhood">SHERWOOD</h1>
        <p className="text-xs text-zinc-500">Enter pools → VRF picks winners → Claim tokens</p>
      </div>
      <RaffleApp />
    </div>
  )
}
