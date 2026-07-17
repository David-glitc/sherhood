"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

const USDG_SRC = "/tokens/usdg.png"

type UsdgLogoProps = {
  size?: number
  className?: string
  showLabel?: boolean
  labelClassName?: string
}

export function UsdgLogo({ size = 20, className, showLabel = false, labelClassName }: UsdgLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="relative shrink-0 overflow-hidden rounded-full bg-white"
        style={{ width: size, height: size }}
      >
        <Image
          src={USDG_SRC}
          alt="USDG"
          width={size}
          height={size}
          className="h-full w-full object-contain p-0.5"
          unoptimized
        />
      </span>
      {showLabel && (
        <span className={cn("text-sm font-semibold text-white/80", labelClassName)}>USDG</span>
      )}
    </span>
  )
}
