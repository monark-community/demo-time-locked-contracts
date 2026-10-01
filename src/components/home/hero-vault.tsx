"use client"

import { LockKeyholeIcon } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { ScheduleChart, scheduleDomain } from "@/components/charts/schedule-chart"
import type { Dictionary } from "@/i18n"
import type { Locale } from "@/i18n/config"
import { t } from "@/i18n/t"
import type { Schedule } from "@/lib/demo/types"
import { scheduleUnlocked, tranches } from "@/lib/demo/vesting"
import { formatToken } from "@/lib/format"

const TOTAL = "12000000000" // 12,000 tUSDC (6 decimals)
const SCHEDULE: Schedule = {
  kind: "monthly",
  start: "2026-01-15T12:00:00.000Z",
  end: "2026-07-15T12:00:00.000Z",
  cliff: null,
  steps: 6,
}
const LOOP = 9000

const noop = () => () => {}
const useMounted = () => useSyncExternalStore(noop, () => true, () => false)

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  )
}

/**
 * Hero visual: a contributor grant unlocking in six monthly steps. A "today"
 * line sweeps across the months and each padlock opens as it is passed.
 */
export function HeroVault({ locale, copy }: { locale: Locale; copy: Dictionary["home"]["hero"] }) {
  const mounted = useMounted()
  const reduced = useReducedMotion()
  const [x0, x1] = scheduleDomain(SCHEDULE)
  const steps = tranches({ schedule: SCHEDULE, total: TOTAL })
  const halfway = (new Date(steps[2]!.at).getTime() + new Date(steps[3]!.at).getTime()) / 2
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (reduced) return
    let raf = 0
    let last = 0
    const began = performance.now()
    const tick = (ts: number) => {
      // ~30 fps is plenty for a slow sweep.
      if (ts - last > 33) {
        last = ts
        setElapsed((ts - began) % LOOP)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const progress = Math.min(1, Math.max(0, (elapsed - 700) / 6500))
  const cut = reduced ? halfway : x0 + (x1 - x0) * progress

  const unlocked = scheduleUnlocked(SCHEDULE, BigInt(TOTAL), cut)
  const locked = BigInt(TOTAL) - unlocked
  const first = new Date(steps[0]!.at).getTime()
  const state = cut < first ? copy.states.waiting : unlocked >= BigInt(TOTAL) ? copy.states.done : copy.states.unlocking

  return (
    <figure aria-label={copy.label} className="relative rounded-3xl border bg-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-extrabold">{copy.name}</p>
          <p className="text-sm text-muted-foreground">
            {copy.meta} · {copy.recipient}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary-ink" aria-hidden="true">
          <LockKeyholeIcon className="size-5" strokeWidth={1.75} />
        </span>
      </div>

      <div aria-hidden="true">
        {mounted ? (
          <ScheduleChart
            schedule={SCHEDULE}
            total={TOTAL}
            cut={cut}
            label={copy.label}
            size="lg"
            className="mt-5"
            markers={[{ at: cut, label: copy.today, tone: "today" }]}
            ticks={steps.map((s, i) => ({ at: new Date(s.at).getTime(), label: t(copy.month, { n: i + 1 }) }))}
          />
        ) : (
          <div className="mt-5 h-56 sm:h-64" />
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground">{copy.unlocked}</p>
          <p className="text-xl font-extrabold tabular sm:text-2xl">{formatToken(unlocked, "tUSDC", locale)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground">{copy.locked}</p>
          <p className="text-xl font-extrabold text-muted-foreground tabular sm:text-2xl">{formatToken(locked, "tUSDC", locale)}</p>
        </div>
      </div>
      <p aria-hidden="true" className="mt-3 text-sm font-semibold text-primary-ink">
        {state}
      </p>
    </figure>
  )
}
