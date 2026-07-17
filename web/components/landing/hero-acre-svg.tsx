"use client"

/**
 * Hero mark — pure SVG motion.
 * Concentric field + two orbits of real stock logos around a lime vault core.
 * Logos counter-rotate so they stay upright while orbiting.
 */

const OUTER_ORBIT = ["NVDA", "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN"]
const INNER_ORBIT = ["META", "SPY", "COIN"]

function LogoNode({
  symbol,
  x,
  y,
  r,
  dur,
  direction,
}: {
  symbol: string
  x: number
  y: number
  r: number
  dur: string
  direction: 1 | -1
}) {
  const clipId = `hero-clip-${symbol}`
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Counter-rotate so the logo stays upright while the parent group orbits */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={direction === 1 ? "0 0 0" : "360 0 0"}
          to={direction === 1 ? "-360 0 0" : "0 0 0"}
          dur={dur}
          repeatCount="indefinite"
        />
        <circle r={r + 5} fill="#0f0f0f" stroke="#333333" strokeWidth="1" />
        <circle r={r + 5} fill="none" stroke="#ccff00" strokeWidth="1" opacity="0.25" />
        <clipPath id={clipId}>
          <circle r={r} />
        </clipPath>
        <image
          href={`/stocks/${symbol}.png`}
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
    </g>
  )
}

export function HeroAcreSvg({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[min(88vw,460px)] ${className}`}>
      <svg
        viewBox="0 0 420 420"
        className="h-full w-full hero-acre-svg"
        role="img"
        aria-label="Stock tokens orbiting a Sherhood basket"
      >
        <defs>
          <radialGradient id="acre-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ccff00" stopOpacity="1" />
            <stop offset="45%" stopColor="#ccff00" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="acre-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ccff00" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#333333" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ccff00" stopOpacity="0.35" />
          </linearGradient>
          <filter id="acre-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="210" cy="210" r="175" fill="url(#acre-core)" className="hero-acre-breathe" />

        {/* Outer tick field */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 210 210"
            to="360 210 210"
            dur="90s"
            repeatCount="indefinite"
          />
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i * 10 * Math.PI) / 180
            const x1 = 210 + Math.cos(a) * 190
            const y1 = 210 + Math.sin(a) * 190
            const x2 = 210 + Math.cos(a) * (i % 3 === 0 ? 204 : 196)
            const y2 = 210 + Math.sin(a) * (i % 3 === 0 ? 204 : 196)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={i % 3 === 0 ? "#ccff00" : "#333333"}
                strokeWidth={i % 3 === 0 ? 1.5 : 1}
                opacity="0.5"
              />
            )
          })}
        </g>

        {/* Orbit tracks */}
        <circle
          cx="210"
          cy="210"
          r="152"
          fill="none"
          stroke="url(#acre-ring)"
          strokeWidth="1"
          strokeDasharray="5 9"
          opacity="0.7"
        />
        <circle
          cx="210"
          cy="210"
          r="92"
          fill="none"
          stroke="#333333"
          strokeWidth="1"
          strokeDasharray="2 7"
          opacity="0.8"
        />

        {/* Outer orbit — real stock logos, upright */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 210 210"
            to="360 210 210"
            dur="56s"
            repeatCount="indefinite"
          />
          {OUTER_ORBIT.map((sym, i) => {
            const a = ((i * 360) / OUTER_ORBIT.length - 90) * (Math.PI / 180)
            const x = 210 + Math.cos(a) * 152
            const y = 210 + Math.sin(a) * 152
            return (
              <LogoNode key={sym} symbol={sym} x={x} y={y} r={15} dur="56s" direction={1} />
            )
          })}
        </g>

        {/* Inner orbit — counter direction, smaller logos */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 210 210"
            to="0 210 210"
            dur="42s"
            repeatCount="indefinite"
          />
          {INNER_ORBIT.map((sym, i) => {
            const a = ((i * 360) / INNER_ORBIT.length - 90) * (Math.PI / 180)
            const x = 210 + Math.cos(a) * 92
            const y = 210 + Math.sin(a) * 92
            return (
              <LogoNode key={sym} symbol={sym} x={x} y={y} r={11} dur="42s" direction={-1} />
            )
          })}
        </g>

        {/* Center vault */}
        <g filter="url(#acre-glow)" className="hero-acre-pulse">
          <circle cx="210" cy="210" r="40" fill="#0a0a0a" stroke="#ccff00" strokeWidth="1.75" />
          <circle cx="210" cy="210" r="26" fill="#ccff00" />
          <path d="M197 199 L210 225 L223 199 L210 206 Z" fill="#000000" />
          <path
            d="M190 190 C201 179 219 179 230 190"
            fill="none"
            stroke="#000000"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  )
}
