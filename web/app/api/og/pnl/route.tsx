import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { loadBrandBanner, OG_SIZE } from "@/lib/og-frame"

export const runtime = "nodejs"

function num(v: string | null, fallback = 0) {
  if (v == null || v === "") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function fmt(n: number) {
  const sign = n > 0 ? "+" : ""
  return `${sign}$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
}

/** Dynamic Mark PnL card for Twitter / OG share. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const name = (searchParams.get("name") || "Trader").slice(0, 32)
  const mark = num(searchParams.get("mark"))
  const cost = num(searchParams.get("cost"))
  const pnl = num(searchParams.get("pnl"), mark - cost)
  const scope = searchParams.get("scope") === "one" ? "one" : "all"
  const tokenId = (searchParams.get("tokenId") || "").slice(0, 24)
  const profit = pnl >= 0
  const accent = profit ? "#ccff00" : "#f87171"
  const banner = await loadBrandBanner()
  const pct = cost > 0 ? (pnl / cost) * 100 : 0
  const scopeLabel =
    scope === "one" && tokenId ? `Sherd #${tokenId}` : "All Sherds"

  return new ImageResponse(
    (
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(115deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.78) 100%)",
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
            padding: "48px 56px",
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
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: "0.16em",
              }}
            >
              SHERHOOD PnL
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 18px",
                borderRadius: 999,
                background: "#050806",
                border: `3px solid ${accent}`,
                color: accent,
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {profit ? "PROFIT" : "LOSS"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 900,
              padding: "36px 40px",
              borderRadius: 28,
              background: "#050806",
              border: `4px solid ${accent}`,
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {name} · {scopeLabel}
            </div>
            <div
              style={{
                display: "flex",
                color: accent,
                fontSize: 88,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              {fmt(pnl)}
            </div>
            <div
              style={{
                display: "flex",
                color: "#f4f4f5",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {pct >= 0 ? "+" : ""}
              {pct.toFixed(2)}% · Mark ${mark.toFixed(2)} · Cost ${cost.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "12px 18px",
              borderRadius: 999,
              background: "#ccff00",
              color: "#050806",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            sherhood.xyz · live mark
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
