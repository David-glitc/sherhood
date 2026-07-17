"use client"

/**
 * Basket vault orbit — progress ring + orbiting RH stock nodes.
 * Pure SVG motion; respects prefers-reduced-motion via CSS.
 */
export function BasketOrbitSvg({
  progress = 0,
  symbols = ["NVDA", "AAPL", "SPY", "MSFT", "GOOG"],
  className = "",
}: {
  progress?: number
  symbols?: string[]
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, progress))
  const circumference = 2 * Math.PI * 118
  const dash = (pct / 100) * circumference
  const uid = "bkt"
  const nodes = symbols.slice(0, 5)

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[320px] ${className}`}>
      <svg
        viewBox="0 0 340 340"
        className="h-full w-full basket-orbit-svg"
        role="img"
        aria-label={`Basket funding ${pct.toFixed(0)} percent`}
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

        {/* Track */}
        <circle
          cx="170"
          cy="170"
          r="118"
          fill="none"
          stroke="#222222"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Progress arc */}
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

        {/* Outer dashed spin */}
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

        {/* Inner counter-spin */}
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

        {/* Orbiting stock logos — counter-rotated so they stay upright */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 170 170"
            to="360 170 170"
            dur="36s"
            repeatCount="indefinite"
          />
          {nodes.map((label, i) => {
            const a = ((i * 360) / nodes.length - 90) * (Math.PI / 180)
            const x = 170 + Math.cos(a) * 118
            const y = 170 + Math.sin(a) * 118
            const clipId = `${uid}-clip-${label}`
            return (
              <g key={label} transform={`translate(${x} ${y})`}>
                <g>
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 0 0"
                    to="-360 0 0"
                    dur="36s"
                    repeatCount="indefinite"
                  />
                  <circle r="18" fill="#0f0f0f" stroke="#333333" strokeWidth="1" />
                  <circle r="18" fill="none" stroke="#ccff00" strokeWidth="1" opacity="0.25" />
                  <clipPath id={clipId}>
                    <circle r="13" />
                  </clipPath>
                  <image
                    href={`/stocks/${label.toUpperCase()}.png`}
                    x="-13"
                    y="-13"
                    width="26"
                    height="26"
                    clipPath={`url(#${clipId})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              </g>
            )
          })}
        </g>

        {/* Center vault */}
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
    </div>
  )
}
