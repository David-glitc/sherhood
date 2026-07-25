/**
 * Pots still on-chain but intentionally omitted from discovery / listings.
 * Direct /pools/[address] URLs still work (e.g. for support).
 *
 * Empty / cancelled draft pots stay hidden. Revealed vaults with deposits stay visible.
 */
import { getAddress, isAddress } from "viem"

export const HIDDEN_POT_ADDRESSES = new Set(
  [
    // Draft / empty / cancelled test pots
    "0x1C9D462cd7401140436f2b2B0C9F630dc8208A02",
    "0xe9936388BE59E5a48CFba62a6238f442E1CDEBdD",
    "0x24298D352bCB704249ADF97D79fE8f9D93d3c427",
    "0x6108B46315a43DeA37493524A0C5f0cA66A87962",
    "0x4a027D25D5264FBb0F7f1bF8cCfcfD166c0b13F4",
  ].map((a) => a.toLowerCase())
)

/**
 * Verified live pools that must appear even if a factory index is partial
 * or a CDN response is stale. Includes both revealed vaults on RH.
 */
export const FEATURED_POT_ADDRESSES = [
  "0x80D61011E00247c988C73B07fC5cDed54f075910", // Orynth #1
  "0x91AA13F1f6e19930fD60F1a87211B0c6D7f3914B", // Crimson Talon (revealed)
  "0xcD5efcCf00E9Fd9839919a9AD478621649FFceD4", // Stock Gacha
] as const

function checksumPot(address: string): `0x${string}` | null {
  if (!isAddress(address)) return null
  try {
    return getAddress(address)
  } catch {
    return null
  }
}

export function isHiddenPot(address: string): boolean {
  return HIDDEN_POT_ADDRESSES.has(address.toLowerCase())
}

export function filterVisiblePots<T extends string>(addresses: readonly T[]): T[] {
  return addresses.filter((a) => !isHiddenPot(a))
}

/**
 * Combine the active factory index with known live pools.
 * Always returns checksummed addresses for wagmi reads.
 */
export function allVisiblePots(addresses: readonly `0x${string}`[]): `0x${string}`[] {
  const unique = new Map<string, `0x${string}`>()
  for (const raw of [...FEATURED_POT_ADDRESSES, ...addresses]) {
    const address = checksumPot(raw)
    if (!address || isHiddenPot(address)) continue
    unique.set(address.toLowerCase(), address)
  }
  return [...unique.values()]
}
