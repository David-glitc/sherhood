"use client"

import Link from "next/link"
import { TELEGRAM_HANDLE, TELEGRAM_URL, X_URL, X_HANDLE, OPENSEA_COLLECTION_URL } from "@/lib/protocol"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { buttonVariants } from "@/components/ui/button"

export default function TelegramHubPage() {
  return (
    <PageShell narrow className="pb-16">
      <PageHeader
        eyebrow="Community"
        title={`@${TELEGRAM_HANDLE}`}
        description="Join the Sherhood hub on Telegram. Pool alerts, drops, and product updates live there."
      />

      <div className="flex flex-wrap gap-3">
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "lg" })}
        >
          Open Telegram
        </a>
        <a
          href={X_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          X @{X_HANDLE}
        </a>
        <a
          href={OPENSEA_COLLECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          OpenSea
        </a>
        <Link href="/app" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Browse pools
        </Link>
      </div>
    </PageShell>
  )
}
