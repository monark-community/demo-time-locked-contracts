import { LockIcon, LockOpenIcon } from "lucide-react"

import { curve, tranches } from "@/lib/demo/vesting"
import type { Schedule } from "@/lib/demo/types"
import { cn } from "@/lib/utils"

/**
 * The schedule chart: unlocked amount over time, as flat orange line art.
 * Lines are an SVG stretched to the plot; everything textual (labels, padlocks,
 * markers) is HTML positioned in percent, so it stays crisp at any width.
 * No hooks: renders on the server (home, how-it-works) and the client (app).
 */

export interface ChartMarker {
  at: number
  label: string
  tone?: "today" | "preview" | "cliff" | "revoked"
}

export interface ScheduleChartProps {
  schedule: Schedule
  total: string
  /** Everything up to this moment is drawn as unlocked (solid, filled). */
  cut?: number | null
  /** Unlocking stops here (revoked vaults). */
  stopAt?: number | null
  markers?: ChartMarker[]
  /** X-axis labels. Defaults to none. */
  ticks?: { at: number; label: string }[]
  /** Accessible description of the chart. */
  label: string
  className?: string
  /** Show padlocks on discrete tranches (monthly / date schedules). */
  padlocks?: boolean
  /** Visual size preset. */
  size?: "sm" | "md" | "lg"
}

const W = 1000
const H = 1000

export function scheduleDomain(schedule: Schedule): [number, number] {
  const start = new Date(schedule.start).getTime()
  const end = new Date(schedule.end).getTime()
  const span = Math.max(1, end - start)
  return [start, end + span * 0.06]
}

export function ScheduleChart({
  schedule,
  total,
  cut = null,
  stopAt = null,
  markers = [],
  ticks = [],
  label,
  className,
  padlocks = true,
  size = "md",
}: ScheduleChartProps) {
  const [x0, x1] = scheduleDomain(schedule)
  const totalBig = BigInt(total) > 0n ? BigInt(total) : 1n
  const fx = (t: number) => Math.min(1, Math.max(0, (t - x0) / (x1 - x0)))
  const fy = (v: bigint) => Number((v * 10000n) / totalBig) / 10000

  // Curve, flattened after a revocation.
  let pts = curve({ schedule, total: totalBig.toString() })
  if (stopAt !== null) {
    const kept: [number, bigint][] = []
    let last = 0n
    for (const [t, v] of pts) {
      if (t <= stopAt) {
        kept.push([t, v])
        last = v
      }
    }
    kept.push([stopAt, last])
    pts = kept
  }
  // Extend to the right edge of the domain.
  const lastPt = pts[pts.length - 1]!
  pts = [...pts, [x1, lastPt[1]]]

  const px = (t: number) => fx(t) * W
  const py = (v: bigint) => (1 - fy(v)) * H
  const toPath = (p: [number, bigint][]) => p.map(([t, v], i) => `${i ? "L" : "M"}${px(t).toFixed(1)} ${py(v).toFixed(1)}`).join(" ")
  const line = toPath(pts)

  // The unlocked part: the curve up to the cut, interpolated at the cut itself.
  const past: [number, bigint][] = []
  if (cut !== null && cut > x0) {
    for (let i = 0; i < pts.length; i++) {
      const [t, v] = pts[i]!
      if (t <= cut) {
        past.push([t, v])
        continue
      }
      const [pt, pv] = pts[i - 1] ?? [x0, 0n]
      const ratio = BigInt(Math.round(((cut - pt) / Math.max(1, t - pt)) * 10000))
      past.push([cut, pv + ((v - pv) * ratio) / 10000n])
      break
    }
  }
  const pastLine = past.length > 1 ? toPath(past) : ""
  const lastPast = past[past.length - 1]
  const pastArea = pastLine && lastPast ? `${pastLine} L${px(lastPast[0]).toFixed(1)} ${H} L${px(past[0]![0]).toFixed(1)} ${H} Z` : ""

  const discrete = padlocks && schedule.kind !== "linear"
  const steps = discrete ? tranches({ schedule, total: totalBig.toString() }) : []
  const locks: { at: number; y: bigint; cancelled: boolean }[] = []
  for (const tr of steps.slice(0, 24)) {
    const at = new Date(tr.at).getTime()
    const y = (locks[locks.length - 1]?.y ?? 0n) + BigInt(tr.amount)
    locks.push({ at, y, cancelled: stopAt !== null && at > stopAt })
  }

  const heights = { sm: "h-28", md: "h-44 sm:h-52", lg: "h-56 sm:h-64" }

  return (
    <figure role="img" aria-label={label} className={cn("relative select-none", heights[size], className)}>
      <div className={cn("absolute inset-x-1 top-7", ticks.length ? "bottom-7" : "bottom-2")}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={H} y2={H} className="stroke-input" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {/* Future: thin dashed line. */}
          <path d={line} fill="none" className="stroke-muted-foreground/60" strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {/* Past: flat orange fill and solid line, up to the cut. */}
          {pastLine ? (
            <>
              <path d={pastArea} className="fill-primary/15" />
              <path d={pastLine} fill="none" className="stroke-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            </>
          ) : null}
        </svg>

        {markers.map((m) => (
          <div
            key={`${m.tone}-${m.label}`}
            aria-hidden="true"
            className="pointer-events-none absolute -top-7 bottom-0 flex flex-col items-center"
            style={{ left: `${fx(m.at) * 100}%`, transform: "translateX(-50%)" }}
          >
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-bold whitespace-nowrap",
                m.tone === "preview" && "bg-primary text-primary-foreground",
                m.tone === "today" && "bg-foreground text-background",
                m.tone === "cliff" && "border border-dashed border-input bg-card text-muted-foreground",
                m.tone === "revoked" && "bg-destructive text-white"
              )}
            >
              {m.label}
            </span>
            <span
              className={cn(
                "w-0 flex-1 border-l",
                m.tone === "preview" && "border-l-2 border-primary",
                m.tone === "today" && "border-foreground",
                m.tone === "cliff" && "border-dashed border-input",
                m.tone === "revoked" && "border-destructive"
              )}
            />
          </div>
        ))}

        {locks.map((l, i) => {
          const open = cut !== null && l.at <= cut && !l.cancelled
          const Icon = open ? LockOpenIcon : LockIcon
          return (
            <span
              key={`${l.at}-${i}`}
              aria-hidden="true"
              className={cn(
                "absolute flex size-6 items-center justify-center rounded-full border bg-card transition-colors duration-200",
                open ? "border-primary text-primary-ink" : "border-input text-muted-foreground",
                l.cancelled && "opacity-40",
                locks.length > 12 && "size-4 [&_svg]:size-2.5"
              )}
              style={{ left: `${fx(l.at) * 100}%`, top: `${(1 - fy(l.y)) * 100}%`, transform: "translate(-50%, -50%)" }}
            >
              <Icon key={open ? "open" : "shut"} className={cn("size-3.5", open && "tv-unlock")} strokeWidth={2.25} />
            </span>
          )
        })}
      </div>

      {ticks.length ? (
        <div aria-hidden="true" className="absolute inset-x-1 bottom-0 h-6">
          {ticks.map((t, i) => (
            <span
              key={`${t.at}-${i}`}
              className="absolute top-1 text-[0.6875rem] font-semibold whitespace-nowrap text-muted-foreground tabular"
              style={{
                left: `${fx(t.at) * 100}%`,
                transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {t.label}
            </span>
          ))}
        </div>
      ) : null}
    </figure>
  )
}
