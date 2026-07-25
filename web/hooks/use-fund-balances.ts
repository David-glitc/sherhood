"use client"

import { useMemo } from "react"
import { formatEther, formatUnits } from "viem"
import { useAccount, useBalance, useReadContract } from "wagmi"
import { ERC20_ABI, USDG_ADDRESS, WETH_ADDRESS, SHRH_ADDRESS } from "@/lib/contracts"
import type { PayAsset } from "@/hooks/use-deposit-pot"
import { USDG_DECIMALS } from "@/lib/usdg"
import { SHRH_SYMBOL } from "@/lib/protocol"

/** Live wallet balances for funding pots (ETH / WETH / USDG / SHERD). */
export function useFundBalances() {
  const { address } = useAccount()

  const { data: ethBal } = useBalance({
    address,
    query: { enabled: !!address },
  })
  const { data: wethRaw } = useReadContract({
    address: WETH_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: usdgRaw } = useReadContract({
    address: USDG_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: sherdRaw } = useReadContract({
    address: SHRH_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const eth = ethBal ? Number(formatEther(ethBal.value)) : null
  const weth = typeof wethRaw === "bigint" ? Number(formatEther(wethRaw)) : null
  const usdg = typeof usdgRaw === "bigint" ? Number(formatUnits(usdgRaw, USDG_DECIMALS)) : null
  const sherd = typeof sherdRaw === "bigint" ? Number(formatEther(sherdRaw)) : null

  const balanceOf = useMemo(() => {
    return (asset: PayAsset): number | null => {
      if (asset === "ETH") return eth
      if (asset === "WETH") return weth
      if (asset === "SHERD") return sherd
      return usdg
    }
  }, [eth, weth, usdg, sherd])

  /** Fill the input — leave a small ETH gas buffer so the tx can still land. */
  const maxFor = (asset: PayAsset): string | null => {
    const bal = balanceOf(asset)
    if (bal == null || bal <= 0) return null
    if (asset === "ETH") {
      const spendable = Math.max(0, bal - 0.00015)
      if (spendable <= 0) return null
      return spendable.toFixed(6).replace(/\.?0+$/, "") || null
    }
    if (asset === "WETH" || asset === "SHERD") {
      return bal.toFixed(6).replace(/\.?0+$/, "") || null
    }
    return bal >= 1 ? bal.toFixed(2).replace(/\.?0+$/, "") : bal.toFixed(4).replace(/\.?0+$/, "")
  }

  const labelOf = (asset: PayAsset): string => {
    const bal = balanceOf(asset)
    if (bal == null) return "…"
    if (asset === "USDG") {
      return bal.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
    if (asset === "SHERD") {
      return bal.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
    return bal.toLocaleString(undefined, { maximumFractionDigits: 5 })
  }

  return { eth, weth, usdg, sherd, balanceOf, maxFor, labelOf, symbol: SHRH_SYMBOL }
}
