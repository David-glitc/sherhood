import Link from "next/link"
import { TELEGRAM_HANDLE, TELEGRAM_URL } from "@/lib/protocol"
import { PageHeader, PageShell } from "@/components/layout/page-shell"
import { buttonVariants } from "@/components/ui/button"

export const metadata = {
  title: "Sherhood Telegram",
  description: "Join the Sherhood community on Telegram.",
}

export default function TelegramHubPage() {
  return (
    <PageShell narrow className="flex min-h-[70dvh] flex-col justify-center">
      <PageHeader
        eyebrow="Community"
        title={`@${TELEGRAM_HANDLE}`}
        description="Follow basket reveals, contract updates, and launch notices on Telegram."
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
      <Link href="/app" className={buttonVariants({ variant: "outline", size: "lg" })}>
        Browse baskets
      </Link>
      </div>
    </PageShell>
  )
}
