"use client"

import { useMemo } from "react"
import { useReadContracts } from "wagmi"
import type { PotHolding } from "@/hooks/use-pots"

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

export type LivePotHolding = PotHolding & {
  /** Original book amount from Pot.getHoldings (unchanged after claims). */
  bookAmount: bigint
  /** True when amount comes from live ERC20 balanceOf(pot). */
  live: boolean
}

/**
 * Pot.claim pays out from vault ERC20 balances but does not shrink getHoldings().
 * For revealed/purchased pools, prefer live token balances so UI tracks burns/claims.
 */
export function useVaultTokenBalances(
  pot: `0x${string}` | undefined,
  holdings: PotHolding[],
  opts?: { enabled?: boolean; refetchInterval?: number }
) {
  const enabled = (opts?.enabled ?? true) && Boolean(pot) && holdings.length > 0
  const { data, isFetching, refetch } = useReadContracts({
    contracts: holdings.map((h) => ({
      address: h.token,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf" as const,
      args: pot ? ([pot] as const) : undefined,
    })),
    query: {
      enabled,
      refetchInterval: opts?.refetchInterval ?? 12_000,
    },
  })

  const liveHoldings: LivePotHolding[] = useMemo(() => {
    return holdings.map((h, i) => {
      const bal =
        data?.[i]?.status === "success" ? (data[i].result as bigint) : undefined
      return {
        ...h,
        bookAmount: h.amount,
        amount: bal ?? h.amount,
        live: bal !== undefined,
      }
    })
  }, [holdings, data])

  return { liveHoldings, isFetching, refetch }
}
