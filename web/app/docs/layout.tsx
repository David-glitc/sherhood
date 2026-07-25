import type { ReactNode } from "react"
import Link from "next/link"
import { DocsSidebar } from "@/components/docs/docs-sidebar"
import { buttonVariants } from "@/components/ui/button"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-container-wide product-page">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Docs
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Learn how pools, cards, trading, and claims work.
          </p>
        </div>
        <Link href="/app" className={buttonVariants()}>
          Open app
        </Link>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <DocsSidebar />
        <article className="prose-docs min-w-0 max-w-3xl flex-1 pb-8">{children}</article>
      </div>
    </div>
  )
}
