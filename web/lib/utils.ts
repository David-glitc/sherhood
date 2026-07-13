import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = 10n ** BigInt(decimals)
  const integer = amount / divisor
  const fraction = amount % divisor
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 6)
  return `${integer.toLocaleString()}.${fractionStr}`
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
