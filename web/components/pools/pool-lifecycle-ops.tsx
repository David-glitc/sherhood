"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useClosePot } from "@/hooks/use-close-pot"
import { isReadyToEndPool, usdgToDollars } from "@/hooks/use-pots"

type PoolLifecycleOpsProps = {
  potAddress: `0x${string}`
  status: number
  fundingGoal: bigint
  deadline: bigint
  totalDeposited: bigint
  participantCount: bigint
  isCreator: boolean
  isConnected: boolean
  onRobinhood: boolean
  onDone: () => Promise<void>
  /** When true, render as the primary aside CTA (replaces mint panel). */
  prominent?: boolean
}

/** End pool (close) + cancel/refunds + auto buy/reveal via ops API. */
export function PoolLifecycleOps({
  potAddress,
  status,
  fundingGoal,
  deadline,
  totalDeposited,
  participantCount,
  isCreator,
  isConnected,
  onRobinhood,
  onDone,
  prominent = false,
}: PoolLifecycleOpsProps) {
  const { close, cancel, isPending } = useClosePot()
  const [advancing, setAdvancing] = useState(false)
  const autoTried = useRef(false)

  const canEnd = isReadyToEndPool(
    status,
    deadline,
    totalDeposited,
    fundingGoal,
    participantCount
  )
  const underfilled =
    status === 0 &&
    Math.floor(Date.now() / 1000) >= Number(deadline) &&
    totalDeposited < fundingGoal &&
    participantCount > 0n
  const needsOpsAdvance = status === 1 || status === 2

  const runAdvanceApi = useCallback(async () => {
    setAdvancing(true)
    try {
      const res = await fetch("/api/ops/advance-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pot: potAddress }),
      })
      const json = (await res.json()) as {
        steps?: string[]
        message?: string
        error?: string
      }
      if (!res.ok) throw new Error(json.error || "Advance failed")
      const moved = (json.steps ?? []).filter((s) => s !== "noop" && s !== "skipped")
      if (moved.length) {
        toast.success(`Pool advanced: ${moved.join(" → ")}`)
      } else if (json.message) {
        toast.message(json.message)
      }
      await onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Advance failed")
    } finally {
      setAdvancing(false)
    }
  }, [potAddress, onDone])

  // Auto-end + buy/reveal whenever the pool is past funding or mid-pipeline.
  useEffect(() => {
    if (autoTried.current) return
    if (!(canEnd || needsOpsAdvance)) return
    autoTried.current = true
    void runAdvanceApi()
  }, [canEnd, needsOpsAdvance, runAdvanceApi])

  if (status === 3) {
    return (
      <div className="rounded-[22px] border border-[#ccff00]/20 bg-[#0a0a0a] p-4 sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ccff00]/80">
          VAULT LIVE
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
          Sherds revealed. Claim your share from Your Sherds or inventory.
        </p>
      </div>
    )
  }

  if (status === 4) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-[#0a0a0a] p-4 sm:p-5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-white/50">
          CANCELLED
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/40">
          Refunds are open for sealed Sherds on this pool.
        </p>
      </div>
    )
  }

  if (!canEnd && !underfilled && !needsOpsAdvance) return null

  const raisedUsd = usdgToDollars(totalDeposited)
  const goalUsd = usdgToDollars(fundingGoal)

  return (
    <div
      className={
        prominent
          ? "rounded-[22px] border border-[#ccff00]/35 bg-[#0a0a0a] p-5 shadow-[0_0_60px_rgba(204,255,0,0.06)] sm:p-7"
          : "rounded-[22px] border border-[#ccff00]/25 bg-[#0a0a0a] p-4 sm:p-5"
      }
    >
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ccff00]/80">
        {needsOpsAdvance ? "FINISH POOL" : isCreator ? "END POOL" : "END POOL"}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/40">
        {needsOpsAdvance
          ? "Pool ended — buying vault assets and revealing Sherds (auto when ops is live)."
          : underfilled
            ? `Deadline hit · $${raisedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} / $${goalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}. End to buy with what’s raised, or cancel for refunds.`
            : "Goal or deadline hit. End the pool to buy stocks and unlock reveals."}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {canEnd ? (
          <Button
            type="button"
            className="h-12 rounded-[14px] bg-[#ccff00] font-semibold text-black hover:brightness-110"
            disabled={isPending || advancing}
            onClick={async () => {
              setAdvancing(true)
              try {
                const res = await fetch("/api/ops/advance-pool", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pot: potAddress }),
                })
                const json = (await res.json()) as {
                  steps?: string[]
                  message?: string
                  error?: string
                }
                const moved = (json.steps ?? []).filter(
                  (s) => s !== "noop" && s !== "skipped"
                )
                if (res.ok && moved.length) {
                  toast.success(`Pool advanced: ${moved.join(" → ")}`)
                  await onDone()
                  return
                }
                // Ops missing or close-only skipped → wallet End
                if (!isConnected || !onRobinhood) {
                  toast.message(
                    json.message ||
                      json.error ||
                      "Connect wallet on Robinhood Chain to End pool"
                  )
                  return
                }
                await close(potAddress)
                toast.success("Pool ended")
                await onDone()
                // Kick buy/reveal after wallet close
                const res2 = await fetch("/api/ops/advance-pool", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pot: potAddress }),
                })
                if (res2.ok) {
                  const j2 = (await res2.json()) as { steps?: string[] }
                  const m2 = (j2.steps ?? []).filter(
                    (s) => s !== "noop" && s !== "skipped"
                  )
                  if (m2.length) toast.success(`Pool advanced: ${m2.join(" → ")}`)
                  await onDone()
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "End pool failed")
              } finally {
                setAdvancing(false)
              }
            }}
          >
            {advancing || isPending ? "Ending…" : "End pool"}
          </Button>
        ) : null}

        {needsOpsAdvance && !canEnd ? (
          <Button
            type="button"
            className="h-12 rounded-[14px] bg-[#ccff00] font-semibold text-black hover:brightness-110"
            disabled={advancing}
            onClick={() => void runAdvanceApi()}
          >
            {advancing ? "Working…" : status === 1 ? "Buy + reveal" : "Reveal Sherds"}
          </Button>
        ) : null}

        {underfilled ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-[14px] border-[#333333]"
            disabled={isPending || !isConnected || !onRobinhood}
            onClick={async () => {
              try {
                await cancel(potAddress)
                toast.success("Pool cancelled — refunds open")
                await onDone()
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Cancel failed")
              }
            }}
          >
            {isPending ? "…" : "Cancel · open refunds"}
          </Button>
        ) : null}

        {!isConnected && canEnd ? (
          <p className="text-center text-[11px] text-white/35">
            Ending runs on the server when ops is configured — tap End pool.
          </p>
        ) : null}
      </div>
    </div>
  )
}
