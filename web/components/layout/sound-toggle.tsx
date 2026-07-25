"use client"

import { useEffect, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { isSfxEnabled, setSfxEnabled } from "@/lib/sfx"
import { cn } from "@/lib/utils"

/** Toggle mint/send UI sounds (persisted). */
export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(true)

  useEffect(() => {
    setOn(isSfxEnabled())
    const sync = () => setOn(isSfxEnabled())
    window.addEventListener("sherhood:sfx", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("sherhood:sfx", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  return (
    <button
      type="button"
      aria-label={on ? "Mute sounds" : "Enable sounds"}
      title={on ? "Sounds on" : "Sounds off"}
      onClick={() => {
        const next = !on
        setSfxEnabled(next)
        setOn(next)
      }}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition",
        "hover:border-[#ccff00]/35 hover:text-[#ccff00]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccff00]/50",
        className
      )}
    >
      {on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  )
}
