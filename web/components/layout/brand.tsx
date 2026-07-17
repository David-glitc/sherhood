"use client"

import Link from "next/link"
import Image from "next/image"

const LOCKUP = "/brand-lockup-hood.png"

/** RH faucet accent / Sherhood lime — #CCFF00 */
export const BRAND_LIME = "#CCFF00"

type LockupProps = {
  height?: number
  className?: string
  priority?: boolean
}

/** Full sherhood lockup — icon + wordmark + .xyz (no crops). */
export function BrandLockup({ height = 48, className = "", priority = false }: LockupProps) {
  return (
    <Image
      src={LOCKUP}
      alt="Sherhood"
      width={height}
      height={height}
      className={`max-w-full rounded-xl object-contain ${className}`}
      style={{ height, width: "auto" }}
      priority={priority}
      unoptimized
    />
  )
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex min-w-0 max-w-[30vw] shrink items-center sm:max-w-none sm:shrink-0 ${className}`}>
      <BrandLockup height={32} priority className="sm:hidden" />
      <BrandLockup height={44} priority className="hidden sm:block" />
    </Link>
  )
}

/** @deprecated use BrandLockup */
export function BrandMark({ size = 44 }: { size?: number }) {
  return <BrandLockup height={size} />
}
