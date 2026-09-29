import { intlLocale, type Locale } from "@/i18n/config"
import { TOKENS, toNumber } from "@/lib/demo/tokens"
import type { TokenSymbol } from "@/lib/demo/types"

/** Locale-aware decimal formatting of base units, exact (no float rounding of the whole part). */
export function formatUnits(value: bigint | string, decimals: number, locale: Locale, maxFrac = 2): string {
  const raw = typeof value === "bigint" ? value : BigInt(value)
  const negative = raw < 0n
  const abs = negative ? -raw : raw
  const base = 10n ** BigInt(decimals)
  const whole = abs / base
  const frac = abs % base
  const nf = new Intl.NumberFormat(intlLocale[locale])
  const wholeStr = nf.format(whole)
  let fracStr = frac.toString().padStart(decimals, "0").slice(0, maxFrac).replace(/0+$/, "")
  // Tiny non-zero amounts (rounding dust) keep enough digits to be visible.
  if (!fracStr && frac > 0n && whole === 0n) {
    fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "")
  }
  const sep = nf.formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? "."
  return `${negative ? "-" : ""}${wholeStr}${fracStr ? sep + fracStr : ""}`
}

export function formatToken(value: bigint | string, symbol: TokenSymbol, locale: Locale, maxFrac = 2): string {
  return `${formatUnits(value, TOKENS[symbol].decimals, locale, maxFrac)} ${symbol}`
}

export function formatUsd(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(fraction: number, locale: Locale, maxFrac = 2): string {
  return new Intl.NumberFormat(intlLocale[locale], { style: "percent", maximumFractionDigits: maxFrac }).format(fraction)
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 2 }).format(n)
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "medium" }).format(new Date(iso))
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
}

export function formatDateLong(iso: string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso))
}

export function formatDateShort(iso: string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "short" }).format(new Date(iso))
}

export function formatMonthYear(iso: string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { month: "short", year: "2-digit" }).format(new Date(iso))
}

/** "in 3 days", "dans 2 mois": the largest sensible unit. */
export function formatRelative(target: number, now: number, locale: Locale): string {
  const diff = target - now
  const rtf = new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" })
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute")
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour")
  if (abs < 45 * day) return rtf.format(Math.round(diff / day), "day")
  return rtf.format(Math.round(diff / (30.44 * day)), "month")
}

/** Split a duration into days / hours / minutes / seconds for a countdown. */
export function countdownParts(msLeft: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(msLeft / 1000))
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

export function tokenToNumber(value: bigint | string, symbol: TokenSymbol): number {
  return toNumber(value, TOKENS[symbol].decimals)
}

export function shortHash(hash: string, start = 8, end = 6): string {
  return hash.length > start + end + 1 ? `${hash.slice(0, start)}…${hash.slice(-end)}` : hash
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
