import Image from "next/image"
import { HeroOrbitSlot } from "@/components/landing/hero-orbit-slot"

/**
 * Hero LCP card — server component.
 * Static sized WebP + explicit dimensions; orbit logos deferred off the critical path.
 */
export function HeroPrism() {
  return (
    <div
      className="relative mx-auto aspect-[2/3] w-full max-w-[26rem] sm:max-w-[30rem]"
      aria-label="Sherhood mystery ownership card"
    >
      <div aria-hidden className="absolute inset-[8%] rounded-full border border-primary/15" />
      <div aria-hidden className="absolute inset-[18%] rounded-full border border-dashed border-primary/20" />
      <div
        aria-hidden
        className="absolute inset-[23%] rounded-full bg-primary/10 blur-[64px]"
      />

      <HeroOrbitSlot />

      <div className="absolute inset-[10%] z-10 sm:inset-[12%]">
        <div className="relative h-full w-full hero-float-slow">
          <div
            aria-hidden
            className="absolute inset-[6%] translate-x-5 translate-y-5 rotate-3 rounded-[1.75rem] border border-primary/20 bg-primary/[0.03]"
          />
          <div
            aria-hidden
            className="absolute inset-[3%] -translate-x-3 translate-y-2 -rotate-2 rounded-[1.75rem] border border-white/10 bg-white/[0.02]"
          />

          <div className="absolute inset-[6%] overflow-hidden rounded-[1.75rem] border border-primary/55 bg-card shadow-[0_40px_120px_rgba(0,0,0,0.75)] sm:inset-[8%]">
            <Image
              src="/cards/mystery-hero-lcp.webp"
              alt="Sherhood sealed ownership card"
              width={430}
              height={645}
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) 72vw, 430px"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(115deg,transparent_18%,rgba(204,255,0,0.16)_44%,transparent_66%)] bg-[length:220%_100%] card-foil-sheen"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-5 pb-5 pt-16">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Sealed pool
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-xl font-semibold text-foreground sm:text-2xl">
                  Your share waits inside.
                </p>
                <span className="shrink-0 rounded-lg border border-white/15 bg-black/50 px-2 py-1 font-mono text-xs text-muted-foreground">
                  #4663
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
