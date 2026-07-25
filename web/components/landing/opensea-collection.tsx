"use client"

import Image from "next/image"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { OPENSEA_COLLECTION_URL } from "@/lib/protocol"
import { cn } from "@/lib/utils"

/** Landing showcase for the official Sherds OpenSea collection. */
export function OpenSeaCollectionSection({ className }: { className?: string }) {
  return (
    <section
      className={cn("page-container-wide py-16 sm:py-20", className)}
      aria-labelledby="opensea-heading"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Official collection
          </p>
          <h2
            id="opensea-heading"
            className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
          >
            Sherds on OpenSea
          </h2>
        </div>
        <a
          href={OPENSEA_COLLECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5"
          )}
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open collection
        </a>
      </div>

      <a
        href={OPENSEA_COLLECTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070707] transition hover:border-[#ccff00]/35"
      >
        <Image
          src="/opensea-sherds-banner.jpg"
          alt="Sherds collection on OpenSea — Robinhood Chain"
          width={1024}
          height={305}
          className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.01]"
          sizes="(max-width: 1280px) 100vw, 1200px"
          priority={false}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-6">
          <div>
            <p className="text-lg font-semibold text-white sm:text-xl">Sherds</p>
            <p className="mt-0.5 text-xs text-white/55 sm:text-sm">
              Robinhood Chain · liquid positions
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccff00] px-3 py-1.5 text-xs font-bold text-black">
            View on OpenSea
            <ExternalLink className="size-3.5" aria-hidden />
          </span>
        </div>
      </a>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Trade Sherds on{" "}
        <Link href="/marketplace" className="font-semibold text-primary hover:underline">
          Sherhood Trade
        </Link>{" "}
        or the official OpenSea collection.
      </p>
    </section>
  )
}
