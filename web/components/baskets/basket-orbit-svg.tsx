"use client"

import { StockLogo } from "@/components/stocks/stock-logo"
import { cn } from "@/lib/utils"

/**
 * Sherd pool vault orbit — progress ring + orbiting RH stock logos.
 * HTML logos (not SVG <image>) so /stocks/*.png always render.
 */
export function BasketOrbitSvg({
  progress = 0,
  symbols = ["NVDA", "AAPL", "SPY", "MSFT", "GOOGL"],
  className = "",
  /** Hide ticker text — logos / anonymous nodes only (pool shopfront). */
  anonymous = false,
}: {
  progress?: number
  symbols?: string[]
  className?: string
  anonymous?: boolean
}) {
  const pct = Math.max(0, Math.min(100, progress))
  const circumference = 2 * Math.PI * 118
  const dash = (pct / 100) * circumference
  const uid = "bkt"
  const nodes = (symbols.length > 0 ? symbols : ["NVDA", "AAPL", "SPY", "MSFT", "GOOGL"])
    .map((s) => s.toUpperCase())
    .slice(0, 5)

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[320px]", className)}>
      <svg
        viewBox="0 0 340 340"
        className="h-full w-full basket-orbit-svg"
        role="img"
        aria-label={`Pool funding ${pct.toFixed(0)} percent · ${nodes.join(", ")}`}
      >
        <defs>
          <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ccff00" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ccff00" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-arc`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ccff00" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#ccff00" />
            <stop offset="100%" stopColor="#9fef00" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="170" cy="170" r="150" fill={`url(#${uid}-core)`} className="basket-orbit-breathe" />

        <circle
          cx="170"
          cy="170"
          r="118"
          fill="none"
          stroke="#222222"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle
          cx="170"
          cy="170"
          r="118"
          fill="none"
          stroke={`url(#${uid}-arc)`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 170 170)"
          filter={`url(#${uid}-glow)`}
          className="basket-orbit-progress"
        />

        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 170 170"
            to="360 170 170"
            dur="72s"
            repeatCount="indefinite"
          />
          <circle
            cx="170"
            cy="170"
            r="142"
            fill="none"
            stroke="#333333"
            strokeWidth="1"
            strokeDasharray="3 9"
            opacity="0.7"
          />
        </g>

        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 170 170"
            to="-360 170 170"
            dur="50s"
            repeatCount="indefinite"
          />
          <circle
            cx="170"
            cy="170"
            r="88"
            fill="none"
            stroke="#ccff00"
            strokeWidth="1"
            strokeDasharray="14 10"
            opacity="0.35"
          />
        </g>

        <g filter={`url(#${uid}-glow)`} className="basket-orbit-core">
          <circle cx="170" cy="170" r="42" fill="#0a0a0a" stroke="#ccff00" strokeWidth="1.75" />
          <circle cx="170" cy="170" r="28" fill="#ccff00" className="basket-orbit-pulse" />
          <text
            x="170"
            y="174"
            textAnchor="middle"
            fill="#000000"
            fontSize="13"
            fontFamily="var(--font-poppins), system-ui, sans-serif"
            fontWeight="700"
          >
            {pct.toFixed(0)}%
          </text>
        </g>
      </svg>

      {/* Orbiting logos — HTML so PNG assets reliably paint */}
      <div
        className="pointer-events-none absolute inset-[11%] basket-orbit-logos"
        aria-hidden
      >
        {nodes.map((label, i) => {
          const angle = (i * 360) / nodes.length - 90
          return (
            <div
              key={`${label}-${i}`}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 0,
                height: 0,
                transform: `rotate(${angle}deg) translateY(-50%)`,
              }}
            >
              <div
                className="basket-orbit-logo-node absolute flex items-center justify-center rounded-full border border-[#333333] bg-[#0f0f0f] shadow-[0_0_0_1px_rgba(204,255,0,0.22)]"
                style={{ width: 44, height: 44, left: -22, top: -22 }}
              >
                {anonymous ? (
                  <span className="size-2.5 rounded-full bg-[#ccff00]/70" />
                ) : (
                  <StockLogo symbol={label} size={30} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
