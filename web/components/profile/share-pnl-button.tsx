"use client"

import { useCallback, useMemo, useState } from "react"
import { Check, Download, Link2, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { absoluteUrl } from "@/lib/seo"
import { cn } from "@/lib/utils"

export type SharePnlCardOption = {
  tokenId: string
  label: string
  markUsd: number
  costUsd: number
  pnlUsd: number
}

type SharePnlButtonProps = {
  name: string
  markUsd: number
  costUsd: number
  pnlUsd: number
  cards?: SharePnlCardOption[]
  className?: string
  disabled?: boolean
}

function buildShareQs(opts: {
  name: string
  markUsd: number
  costUsd: number
  pnlUsd: number
  scope: "all" | "one"
  tokenId?: string
}) {
  const qs = new URLSearchParams({
    name: opts.name.slice(0, 32) || "Trader",
    mark: opts.markUsd.toFixed(2),
    cost: opts.costUsd.toFixed(2),
    pnl: opts.pnlUsd.toFixed(2),
    scope: opts.scope,
  })
  if (opts.tokenId) qs.set("tokenId", opts.tokenId)
  return qs.toString()
}

/** Opens Share PnL modal with All Sherds / one Sherd scope + OG preview. */
export function SharePnlButton({
  name,
  markUsd,
  costUsd,
  pnlUsd,
  cards = [],
  className,
  disabled,
}: SharePnlButtonProps) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<"all" | "one">("all")
  const [tokenId, setTokenId] = useState(cards[0]?.tokenId ?? "")
  const [copied, setCopied] = useState(false)

  const selected = useMemo(
    () => cards.find((c) => c.tokenId === tokenId) ?? cards[0],
    [cards, tokenId]
  )

  const active = useMemo(() => {
    if (scope === "one" && selected) {
      return {
        markUsd: selected.markUsd,
        costUsd: selected.costUsd,
        pnlUsd: selected.pnlUsd,
        tokenId: selected.tokenId,
      }
    }
    return { markUsd, costUsd, pnlUsd, tokenId: undefined as string | undefined }
  }, [scope, selected, markUsd, costUsd, pnlUsd])

  const qs = buildShareQs({
    name,
    markUsd: active.markUsd,
    costUsd: active.costUsd,
    pnlUsd: active.pnlUsd,
    scope,
    tokenId: active.tokenId,
  })
  const shareUrl = absoluteUrl(`/share/pnl?${qs}`)
  const ogUrl = `/api/og/pnl?${qs}`

  const onCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("PnL link copied")
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Could not copy link")
    }
  }, [shareUrl])

  const onNativeShare = useCallback(async () => {
    const title = `${name} · ${active.pnlUsd >= 0 ? "+" : ""}$${active.pnlUsd.toFixed(2)} PnL`
    const text = `Mark $${active.markUsd.toFixed(2)} vs cost $${active.costUsd.toFixed(2)} on Sherhood`
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: shareUrl })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
      }
    }
    await onCopyLink()
  }, [name, active, shareUrl, onCopyLink])

  const onDownload = useCallback(async () => {
    try {
      const res = await fetch(ogUrl)
      if (!res.ok) throw new Error("fetch")
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = `sherhood-pnl-${scope === "one" && active.tokenId ? active.tokenId : "all"}.png`
      a.click()
      URL.revokeObjectURL(href)
      toast.success("Image downloaded")
    } catch {
      toast.error("Could not download image")
    }
  }, [ogUrl, scope, active.tokenId])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn("gap-2", className)}
      >
        <Share2 className="size-3.5" />
        Share PnL
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "max-h-[min(100dvh,720px)] w-full max-w-[calc(100%-1rem)] overflow-y-auto border-border bg-[#080808] sm:max-w-lg",
            "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl"
          )}
        >
          <DialogHeader className="text-left">
            <DialogTitle>Share PnL</DialogTitle>
            <DialogDescription>
              Preview the card, then share, download, or copy a link.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
                scope === "all"
                  ? "bg-[#ccff00]/15 text-[#ccff00]"
                  : "text-white/55 hover:text-white"
              )}
            >
              All Sherds
            </button>
            <button
              type="button"
              onClick={() => setScope("one")}
              disabled={cards.length === 0}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-40",
                scope === "one"
                  ? "bg-[#ccff00]/15 text-[#ccff00]"
                  : "text-white/55 hover:text-white"
              )}
            >
              This Sherd
            </button>
          </div>

          {scope === "one" ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-white/45">Sherd</span>
              <select
                value={selected?.tokenId ?? ""}
                onChange={(e) => setTokenId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none focus:border-[#ccff00]/40"
              >
                {cards.map((c) => (
                  <option key={c.tokenId} value={c.tokenId}>
                    {c.label} · {c.pnlUsd >= 0 ? "+" : ""}${c.pnlUsd.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={ogUrl}
              src={ogUrl}
              alt="PnL share preview"
              className="aspect-[1200/630] w-full object-cover"
            />
          </div>

          <p className="text-center text-sm tabular-nums text-white/55">
            {active.pnlUsd >= 0 ? "+" : ""}${active.pnlUsd.toFixed(2)} · Mark $
            {active.markUsd.toFixed(2)} · cost ${active.costUsd.toFixed(2)}
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button type="button" onClick={onNativeShare} className="gap-2">
              <Share2 className="size-3.5" />
              Share
            </Button>
            <Button type="button" variant="outline" onClick={onDownload} className="gap-2">
              <Download className="size-3.5" />
              Download
            </Button>
            <Button type="button" variant="outline" onClick={onCopyLink} className="gap-2">
              {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
              Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
