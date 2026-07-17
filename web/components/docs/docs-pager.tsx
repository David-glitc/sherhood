import Link from "next/link"
import type { DocNavItem } from "@/lib/docs"

export function DocsPager({
  prev,
  next,
}: {
  prev?: DocNavItem
  next?: DocNavItem
}) {
  if (!prev && !next) return null

  return (
    <div className="mt-14 grid gap-3 border-t border-white/[0.08] pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 transition hover:border-sherhood/40"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
            Previous
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{prev.title}</p>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 text-right transition hover:border-sherhood/40"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">Next</p>
          <p className="mt-1 text-sm font-semibold text-white">{next.title}</p>
        </Link>
      ) : null}
    </div>
  )
}
