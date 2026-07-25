/** Shared OG / Twitter card frame — high-contrast text on brand banner. */
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const OG_SIZE = { width: 1200, height: 630 } as const

export async function loadBrandBanner(): Promise<ArrayBuffer> {
  const bytes = await readFile(join(process.cwd(), "public/brand/sherhood-banner.jpg"))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

type OgFrameProps = {
  banner: ArrayBuffer
  eyebrow?: string
  title: string
  subtitle?: string
  footer?: string
  badge?: string
}

/**
 * Twitter + Open Graph friendly layout.
 * Near-opaque black copy plate + lime title so type stays readable on busy brand art.
 */
export function OgFrame({
  banner,
  eyebrow = "SHERHOOD",
  title,
  subtitle,
  footer = "sherhood.xyz · Robinhood Chain",
  badge,
}: OgFrameProps) {
  const titleSize = title.length > 36 ? 52 : title.length > 24 ? 62 : 74

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#050806",
        fontFamily: "sans-serif",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner as unknown as string}
        width={1200}
        height={630}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {/* Hard darken for X / OG preview thumbnails */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(115deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 42%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "52px 58px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 18px",
              borderRadius: 999,
              background: "#ccff00",
              color: "#050806",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.18em",
            }}
          >
            {eyebrow}
          </div>
          {badge ? (
            <div
              style={{
                display: "flex",
                padding: "10px 18px",
                borderRadius: 999,
                background: "#050806",
                border: "3px solid #ccff00",
                color: "#ccff00",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 880,
            gap: 18,
            padding: "32px 36px",
            borderRadius: 24,
            background: "#050806",
            border: "4px solid #ccff00",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#ccff00",
              fontSize: titleSize,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 28,
                lineHeight: 1.3,
                fontWeight: 700,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 999,
            background: "#ccff00",
            color: "#050806",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.04em",
            alignSelf: "flex-start",
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  )
}
