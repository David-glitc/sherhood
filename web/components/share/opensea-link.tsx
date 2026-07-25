"use client"

import { ExternalLink } from "lucide-react"
import { OPENSEA_COLLECTION_URL, openseaTokenUrl } from "@/lib/protocol"
import { cn } from "@/lib/utils"

type OpenSeaLinkProps = {
  tokenId?: string | number | bigint
  /** Collection link when tokenId omitted */
  className?: string
  compact?: boolean
  label?: string
}

/** External CTA → OpenSea collection or a specific Sherd. */
export function OpenSeaLink({
  tokenId,
  className,
  compact = false,
  label,
}: OpenSeaLinkProps) {
  const href =
    tokenId != null ? openseaTokenUrl(tokenId) : OPENSEA_COLLECTION_URL
  const text =
    label ??
    (tokenId != null
      ? compact
        ? "OpenSea"
        : "View on OpenSea"
      : compact
        ? "Collection"
        : "OpenSea collection")

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] font-semibold text-white/80 transition-colors hover:border-[#ccff00]/40 hover:bg-[#ccff00]/10 hover:text-[#ccff00]",
        compact ? "h-8 px-2.5 text-[11px]" : "h-10 w-full px-3 text-sm",
        className
      )}
    >
      <ExternalLink className={compact ? "size-3" : "size-3.5"} aria-hidden />
      {text}
    </a>
  )
}
