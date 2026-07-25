"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SHRH_SYMBOL } from "@/lib/protocol"

type BuyShrhButtonProps = {
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  label?: string
}

/** Opens Buy $SHERD dialog — Flap / Uniswap. */
export function BuyShrhButton({
  className,
  variant = "outline",
  size = "sm",
  label = `Buy $${SHRH_SYMBOL}`,
}: BuyShrhButtonProps) {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => router.push("/buy-shrd")}
    >
      {label}
    </Button>
  )
}
