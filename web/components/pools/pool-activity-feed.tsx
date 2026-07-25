"use client"

import { useEffect, useState } from "react"
import { robinhood } from "@/lib/chain"

type Item = {
  kind: string
  text: string
  txHash: string
  blockNumber: string
  amountFmt?: string
}

export function PoolActivityFeed({ potAddress }: { potAddress: `0x${string}` }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const explorer = robinhood.blockExplorers.default.url

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/pools/${potAddress}/activity`)
        const json = (await res.json()) as { items?: Item[] }
        if (!alive) return
        setItems(json.items ?? [])
      } catch {
        if (alive) setItems([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [potAddress])

  return (
    <div className="rounded-[22px] border border-[#333333] bg-gradient-to-b from-[#0c0c0c] to-[#080808] p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] tracking-[0.12em] text-[#666666]">POOL PULSE</p>
        <p className="text-[12px] tabular-nums text-[#999999]">{items.length || "—"}</p>
      </div>
      {loading ? (
        <p className="mt-4 text-[13px] text-[#555555]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-[14px] border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-[14px] text-[#666666]">
          No on-chain moves yet.
        </p>
      ) : (
        <ul className="scroll-mask-y mt-3 max-h-72 divide-y divide-[#1a1a1a]">
          {items.map((item, i) => (
            <li
              key={`${item.txHash}-${item.kind}-${i}`}
              className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
            >
              <div className="min-w-0">
                <p className="truncate text-[#e5e7eb]">{item.text}</p>
                {item.txHash ? (
                  <a
                    href={`${explorer}/tx/${item.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block font-mono text-[11px] text-[#666666] hover:text-[#ccff00]"
                  >
                    {item.txHash.slice(0, 10)}…
                  </a>
                ) : null}
              </div>
              {item.amountFmt ? (
                <span className="shrink-0 tabular-nums text-[#999999]">${item.amountFmt}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
