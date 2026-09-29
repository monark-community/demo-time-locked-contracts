"use client"

import { FastForwardIcon } from "lucide-react"
import { useState } from "react"

import { ScheduleChart, scheduleDomain, type ChartMarker } from "@/components/charts/schedule-chart"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"
import { advanceClock } from "@/lib/demo/store"
import type { Vault } from "@/lib/demo/types"
import { entitlement, unlockedAt } from "@/lib/demo/vesting"
import { formatDateLong, formatDateShort, formatMonthYear, formatToken } from "@/lib/format"

import { useAppCopy } from "./app-provider"

const DAY = 86_400_000

/**
 * Signature moment: the time scrubber. Drag along the schedule to preview any
 * date (padlocks open as you pass them); "Fast-forward" makes it the demo's now.
 */
export function ScheduleExplorer({ vault, now }: { vault: Vault; now: number }) {
  const { app, locale } = useAppCopy()
  const c = app.vault.chart
  const [x0, x1] = scheduleDomain(vault.schedule)
  const start = new Date(vault.schedule.start).getTime()
  const end = new Date(vault.schedule.end).getTime()
  const min = Math.min(start, now)
  const max = Math.max(x1, now)

  // The preview never sits in the past: once the clock passes it, it follows "now".
  const [preview, setPreview] = useState<number | null>(null)
  const p = preview !== null && preview > now ? preview : now
  const previewing = p > now + 60_000

  const unlocked = unlockedAt(vault, p)
  const locked = entitlement(vault) - unlocked
  const stopAt = vault.revokedAt ? new Date(vault.revokedAt).getTime() : null

  // Short schedules get day-level labels; long ones month + year.
  const tickLabel = (at: number) => (end - start < 120 * DAY ? formatDateShort(at, locale) : formatMonthYear(at, locale))

  const markers: ChartMarker[] = []
  if (vault.schedule.cliff) markers.push({ at: new Date(vault.schedule.cliff).getTime(), label: c.cliff, tone: "cliff" })
  if (stopAt !== null) markers.push({ at: stopAt, label: c.revoked, tone: "revoked" })
  if (now >= x0 && now <= x1) markers.push({ at: now, label: c.today, tone: "today" })
  if (previewing) markers.push({ at: p, label: tickLabel(p), tone: "preview" })

  const ticks = [
    { at: start, label: tickLabel(start) },
    { at: start + (end - start) / 2, label: tickLabel(start + (end - start) / 2) },
    { at: end, label: tickLabel(end) },
  ]

  const readout = t(previewing ? c.readout : c.readoutToday, {
    date: formatDateLong(p, locale),
    unlocked: formatToken(unlocked, vault.token, locale),
    locked: formatToken(locked > 0n ? locked : 0n, vault.token, locale),
  })

  return (
    <section aria-labelledby="chart-title" className="rounded-3xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="chart-title" className="text-lg font-bold">
          {c.title}
        </h2>
        <p className="text-xs text-muted-foreground">{c.axis}</p>
      </div>

      <ScheduleChart
        schedule={vault.schedule}
        total={vault.total}
        cut={p}
        stopAt={stopAt}
        markers={markers}
        ticks={ticks}
        label={`${c.axis}. ${readout}`}
        size="lg"
        className="mt-4"
      />

      <div className="mt-4">
        <label htmlFor="scrubber" className="text-sm font-bold">
          {c.preview}
        </label>
        <input
          id="scrubber"
          type="range"
          className="tv-range mt-1"
          min={min}
          max={max}
          step={DAY / 4}
          value={p}
          aria-valuetext={formatDateLong(p, locale)}
          onChange={(e) => setPreview(Number(e.target.value))}
        />
        <p aria-live="polite" className="min-h-12 text-sm">
          {readout}
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{c.hint}</p>
          <Button
            variant={previewing ? "default" : "outline"}
            disabled={!previewing}
            className="shrink-0"
            onClick={() => {
              // The chart, figures and padlocks update in place; the readout (aria-live) announces the new day.
              advanceClock(p - now)
              setPreview(null)
            }}
          >
            <FastForwardIcon aria-hidden="true" />
            {c.jump}
          </Button>
        </div>
      </div>
    </section>
  )
}
