"use client"

import { ClockIcon, FastForwardIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { t } from "@/i18n/t"
import { intlLocale } from "@/i18n/config"
import { advanceClock, useDemo, useNow } from "@/lib/demo/store"
import type { Vault } from "@/lib/demo/types"
import { nextUnlock } from "@/lib/demo/vesting"
import { formatDateLong } from "@/lib/format"

import { useAppCopy } from "./app-provider"

const DAY = 86_400_000

/** Soonest discrete unlock across all vaults after `now`, or null. */
export function soonestUnlock(vaults: Vault[], now: number): number | null {
  let best: number | null = null
  for (const v of vaults) {
    const n = nextUnlock(v, now)
    if (!n || n.continuous) continue
    const at = new Date(n.at).getTime()
    if (best === null || at < best) best = at
  }
  return best
}

/** The demo clock: shows simulated time and moves it forward (never back). */
export function DemoClock() {
  const demo = useDemo()
  const now = useNow()
  const { app, locale } = useAppCopy()
  const c = app.clock
  if (!demo || !now) return null

  const days = Math.floor(demo.settings.clockOffset / DAY)
  const next = soonestUnlock(demo.vaults, now)
  const time = new Intl.DateTimeFormat(intlLocale[locale], { hour: "2-digit", minute: "2-digit" }).format(now)

  const forward = (ms: number) => {
    advanceClock(ms)
    toast(t(c.moved, { date: formatDateLong(now + ms, locale) }))
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="flex min-w-0 items-center gap-1.5 text-xs" title={c.hint}>
        <ClockIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="sr-only">{c.label}: </span>
        <span className="hidden font-semibold text-muted-foreground sm:inline">{c.label}</span>
        <span className="truncate font-bold tabular">
          {formatDateLong(now, locale)} · {time}
        </span>
        <span className={days > 0 ? "rounded-full bg-primary/15 px-1.5 font-bold text-primary-ink" : "text-muted-foreground"}>
          {days > 0 ? t(c.ahead, { n: days }) : c.realTime}
        </span>
      </p>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="shrink-0">
            <FastForwardIcon aria-hidden="true" />
            {c.forward}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal whitespace-normal text-muted-foreground">{c.hint}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => forward(DAY)}>{c.day}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => forward(7 * DAY)}>{c.week}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => forward(30 * DAY)}>{c.month}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={next === null} onSelect={() => next !== null && forward(next + 60_000 - now)}>
            {next === null ? c.nextNone : c.next}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
