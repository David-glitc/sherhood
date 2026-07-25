"use client"

import { useCallback, useState } from "react"
import { Check, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { absoluteUrl } from "@/lib/seo"

type ShareButtonProps = {
  path: string
  title: string
  text?: string
  className?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  label?: string
  /** Icon-only share (native share or copy). */
  compact?: boolean
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export function ShareButton({
  path,
  title,
  text,
  className,
  variant = "outline",
  size = "sm",
  label = "Share",
  compact = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const url = absoluteUrl(path)
  const body = text ?? title

  const onShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: body, url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
      }
    }
    try {
      await copyText(url)
      setCopied(true)
      toast.success("Link copied")
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Could not copy link")
    }
  }, [body, title, url])

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onShare}
        className={cn("text-muted-foreground", className)}
        aria-label={copied ? "Copied" : "Share profile"}
        title={url}
      >
        {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      </Button>
    )
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button type="button" variant={variant} size={size} onClick={onShare} className="gap-2">
        {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
        {label}
      </Button>
    </div>
  )
}
