import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"

import { isLocale, locales } from "@/i18n/config"
import { getDictionary } from "@/i18n"

export const alt = "TimeVault by Monark"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : "en"
  const d = getDictionary(locale)
  const mark = await readFile(join(process.cwd(), "public/brand/monark-mark.svg"), "utf8")
  const markSrc = `data:image/svg+xml;base64,${Buffer.from(mark).toString("base64")}`

  // A six-step staircase, three steps unlocked (solid) and three still locked (dashed).
  const stepW = 70
  const stepH = 62
  const x0 = 20
  const yBase = 440
  const solid: string[] = [`M ${x0} ${yBase}`]
  const dashed: string[] = []
  for (let i = 0; i < 6; i++) {
    const x = x0 + (i + 1) * stepW
    const yBefore = yBase - i * stepH
    const yAfter = yBase - (i + 1) * stepH
    const seg = `L ${x} ${yBefore} L ${x} ${yAfter}`
    if (i < 3) solid.push(seg)
    else dashed.push(i === 3 ? `M ${x0 + 3 * stepW} ${yBase - 3 * stepH} ${seg}` : seg)
  }
  const locks = Array.from({ length: 6 }, (_, i) => ({ x: x0 + (i + 1) * stepW, y: yBase - (i + 1) * stepH, open: i < 3 }))

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FFF9F3", color: "#15110E", padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markSrc} width={64} height={64} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>TimeVault</span>
              <span style={{ fontSize: 22, color: "#625952", marginTop: 6 }}>{d.common.byMonark}</span>
            </div>
          </div>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.5 }}>{d.meta.ogTagline}</div>
          <div style={{ fontSize: 22, color: "#625952" }}>{d.common.demoBadge}</div>
        </div>
        <svg width="460" height="486" viewBox="0 0 480 500" style={{ marginLeft: 8 }}>
          <path d={`${solid.join(" ")} L ${x0 + 3 * stepW} ${yBase} Z`} fill="#F88D10" fillOpacity={0.15} />
          <path d={solid.join(" ")} fill="none" stroke="#F88D10" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
          <path d={dashed.join(" ")} fill="none" stroke="#857F7A" strokeWidth={4} strokeDasharray="12 12" />
          <line x1={x0} y1={yBase} x2={x0 + 6 * stepW + 20} y2={yBase} stroke="#857F7A" strokeWidth={3} />
          {locks.map((l) => (
            <circle key={l.x} cx={l.x} cy={l.y} r={22} fill="#FFFEFC" stroke={l.open ? "#F88D10" : "#857F7A"} strokeWidth={5} />
          ))}
          {locks.map((l) => (
            <path
              key={`s${l.x}`}
              d={l.open ? `M ${l.x - 7} ${l.y - 2} v -7 a 7 7 0 0 1 13 -3` : `M ${l.x - 7} ${l.y - 2} v -6 a 7 7 0 0 1 14 0 v 6`}
              fill="none"
              stroke={l.open ? "#B65000" : "#625952"}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          ))}
          {locks.map((l) => (
            <rect key={`b${l.x}`} x={l.x - 10} y={l.y - 3} width={20} height={14} rx={3} fill={l.open ? "#B65000" : "#625952"} />
          ))}
        </svg>
      </div>
    ),
    size
  )
}
