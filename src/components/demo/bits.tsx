"use client"

import { CheckCheckIcon, CircleDotIcon, HourglassIcon, LockIcon, LockOpenIcon, UndoDotIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Dictionary } from "@/i18n"
import { t } from "@/i18n/t"
import type { Locale } from "@/i18n/config"
import { TOKENS } from "@/lib/demo/tokens"
import type { TokenSymbol, Vault, VaultStatus } from "@/lib/demo/types"
import { claimableAt, entitlement, unlockedAt } from "@/lib/demo/vesting"
import { countdownParts, formatDateShort, formatToken } from "@/lib/format"
import { cn } from "@/lib/utils"

type App = Dictionary["app"]

/** Status pill: always an icon plus a text label, never colour alone. */
export function StatusBadge({ status, app, className }: { status: VaultStatus; app: App; className?: string }) {
  const map = {
    locked: { icon: LockIcon, variant: "outline" as const },
    unlocking: { icon: CircleDotIcon, variant: "secondary" as const },
    claimable: { icon: LockOpenIcon, variant: "success" as const },
    awaiting: { icon: HourglassIcon, variant: "warning" as const },
    completed: { icon: CheckCheckIcon, variant: "outline" as const },
    revoked: { icon: UndoDotIcon, variant: "destructive" as const },
  }[status]
  const Icon = map.icon
  return (
    <Badge variant={map.variant} className={className}>
      <Icon aria-hidden="true" />
      {app.status[status]}
    </Badge>
  )
}

/** One-line description of a vault's schedule. */
export function scheduleLine(vault: Pick<Vault, "schedule" | "total" | "token">, app: App, locale: Locale): string {
  const s = vault.schedule
  const l = app.scheduleLine
  if (s.kind === "date") return t(l.date, { date: formatDateShort(s.end, locale) })
  if (s.kind === "monthly") {
    const per = BigInt(vault.total) / BigInt(Math.max(1, s.steps))
    const first = new Date(s.start)
    first.setMonth(first.getMonth() + 1)
    return t(l.monthly, { n: s.steps, amount: formatToken(per, vault.token, locale), date: formatDateShort(first.toISOString(), locale) })
  }
  if (s.cliff) return t(l.linearCliff, { cliff: formatDateShort(s.cliff, locale), end: formatDateShort(s.end, locale) })
  return t(l.linear, { start: formatDateShort(s.start, locale), end: formatDateShort(s.end, locale) })
}

/**
 * The vault bar: claimed (solid orange), claimable (outlined orange),
 * still locked (hatched), returned after revocation (faded). Legend is text.
 */
export function VaultBar({ vault, now, className }: { vault: Vault; now: number; className?: string }) {
  const total = BigInt(vault.total) || 1n
  const claimed = BigInt(vault.claimed)
  const unlocked = unlockedAt(vault, now)
  const claimable = claimableAt(vault, now)
  const waiting = unlocked - claimed - claimable // unlocked but awaiting approval
  const returned = BigInt(vault.returned)
  const locked = entitlement(vault) - unlocked
  const pct = (v: bigint) => `${Number(((v > 0n ? v : 0n) * 10000n) / total) / 100}%`
  return (
    <div aria-hidden="true" className={cn("flex h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <span className="h-full bg-primary transition-[width] duration-200" style={{ width: pct(claimed) }} />
      <span className="h-full border-y-2 border-r-2 border-primary bg-primary/25 transition-[width] duration-200 first:border-l-2" style={{ width: pct(claimable) }} />
      <span className="h-full bg-warning/40 transition-[width] duration-200" style={{ width: pct(waiting) }} />
      <span className="relative h-full transition-[width] duration-200" style={{ width: pct(locked) }}>
        <span className="tv-hatch absolute inset-0" />
      </span>
      <span className="h-full bg-muted-foreground/15" style={{ width: pct(returned) }} />
    </div>
  )
}

/** Live countdown, e.g. 3d 04h 12min 09s, in tabular numerals. */
export function Countdown({ target, now, app, className }: { target: number; now: number; app: App; className?: string }) {
  const c = app.countdown
  const { d, h, m, s } = countdownParts(target - now)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return (
    <span className={cn("tabular inline-flex items-baseline gap-1 font-bold", className)}>
      {d > 0 ? (
        <span>
          {d}
          <span className="text-[0.75em] font-semibold text-muted-foreground">{c.d}</span>
        </span>
      ) : null}
      <span>
        {pad(h)}
        <span className="text-[0.75em] font-semibold text-muted-foreground">{c.h}</span>
      </span>
      <span>
        {pad(m)}
        <span className="text-[0.75em] font-semibold text-muted-foreground">{c.m}</span>
      </span>
      {d === 0 ? (
        <span>
          {pad(s)}
          <span className="text-[0.75em] font-semibold text-muted-foreground">{c.s}</span>
        </span>
      ) : null}
    </span>
  )
}

export function Amount({ value, token, locale, className, frac }: { value: bigint | string; token: TokenSymbol; locale: Locale; className?: string; frac?: number }) {
  const digits = frac ?? (TOKENS[token].usd > 100 ? 4 : 2)
  return <span className={cn("tabular whitespace-nowrap", className)}>{formatToken(value, token, locale, digits)}</span>
}
