"use client"

import { CheckCircle2Icon, DownloadIcon, LockIcon, LockOpenIcon, UndoDotIcon, WalletIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { href } from "@/i18n/config"
import type { AuditKind, Vault } from "@/lib/demo/types"
import { tranches } from "@/lib/demo/vesting"
import { formatDateTime, formatRelative, formatUnits, shortHash } from "@/lib/format"
import { TOKENS } from "@/lib/demo/tokens"
import { cn } from "@/lib/utils"

import { useAppCopy } from "./app-provider"
import { Amount } from "./bits"

type RowKind = AuditKind | "unlocked"

interface Row {
  id: string
  at: number
  kind: RowKind
  actor: string
  actorAddress: string
  amount?: string
  hash?: string
  vault: Vault
}

const ICONS = { locked: LockIcon, claimed: WalletIcon, approved: CheckCircle2Icon, revoked: UndoDotIcon, unlocked: LockOpenIcon }

/** Stored log entries plus the unlocks the schedule produced (no transaction: it's maths on time). */
export function rowsFor(vault: Vault, now: number, bySchedule: string): Row[] {
  const stored: Row[] = vault.log.map((e) => ({ ...e, at: new Date(e.at).getTime(), vault }))
  const stop = vault.revokedAt ? new Date(vault.revokedAt).getTime() : Infinity
  const derived: Row[] = tranches(vault)
    .filter((tr) => vault.schedule.kind !== "linear" || (!!vault.schedule.cliff && tr.index === 1))
    .map((tr) => ({ tr, at: new Date(tr.at).getTime() }))
    .filter(({ at }) => at <= now && at <= stop)
    .map(({ tr, at }) => ({
      id: `${vault.id}-unlock-${tr.index}`,
      at,
      kind: "unlocked" as const,
      actor: bySchedule,
      actorAddress: vault.address,
      amount: tr.amount,
      vault,
    }))
  return [...stored, ...derived]
}

/** Compact recent activity across all vaults (dashboard rail). */
export function ActivityFeed({ vaults, now, limit, className }: { vaults: Vault[]; now: number; limit: number; className?: string }) {
  const { app, locale } = useAppCopy()
  const a = app.vault.activity
  const rows = vaults
    .flatMap((v) => rowsFor(v, now, a.bySchedule))
    .sort((x, y) => y.at - x.at)
    .slice(0, limit)
  if (rows.length === 0) return <p className={cn("text-sm text-muted-foreground", className)}>{app.dashboard.activityEmpty}</p>
  return (
    <ol className={cn("flex flex-col gap-3", className)}>
      {rows.map((r) => {
        const Icon = ICONS[r.kind]
        return (
          <li key={r.id} className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card">
              <Icon className="size-3.5 text-primary-ink" aria-hidden="true" />
            </span>
            <div className="min-w-0 text-sm leading-snug">
              <p>
                <span className="font-semibold">{a.kinds[r.kind]}</span>
                {r.amount ? (
                  <>
                    {" · "}
                    <Amount value={r.amount} token={r.vault.token} locale={locale} />
                  </>
                ) : null}
              </p>
              <p className="truncate text-muted-foreground">
                <Link href={href(locale, `/app/vault/${r.vault.id}`)} className="underline-offset-4 hover:underline">
                  {r.vault.name}
                </Link>{" "}
                · {formatRelative(r.at, now, locale)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

type Filter = "all" | "locked" | "claimed" | "approved" | "revoked"

/** The vault's full activity log, filterable and exportable to CSV. */
export function ActivityLog({ vault, now }: { vault: Vault; now: number }) {
  const { app, locale } = useAppCopy()
  const a = app.vault.activity
  const [filter, setFilter] = useState<Filter>("all")
  const all = rowsFor(vault, now, a.bySchedule).sort((x, y) => y.at - x.at)
  const rows = filter === "all" ? all : all.filter((r) => r.kind === filter)

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const head = [a.csv.time, a.csv.event, a.csv.actor, a.csv.address, a.csv.amount, a.csv.token, a.csv.tx]
    const lines = all.map((r) =>
      [
        new Date(r.at).toISOString(),
        a.kinds[r.kind],
        r.actor,
        r.actorAddress,
        r.amount ? formatUnits(r.amount, TOKENS[vault.token].decimals, "en", 6).replace(/,/g, "") : "",
        vault.token,
        r.hash ?? "",
      ]
        .map(esc)
        .join(",")
    )
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `timevault-${vault.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filters: Filter[] = ["all", "locked", "claimed", "approved", "revoked"]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={a.filterLabel} className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                filter === f ? "border-foreground bg-foreground text-background" : "border-input hover:bg-muted"
              )}
            >
              {a.filters[f]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <DownloadIcon aria-hidden="true" />
          {a.export}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {all.length <= 1 && filter === "all" ? a.empty : a.emptyFilter}
        </p>
      ) : (
        <ol className="flex flex-col divide-y rounded-2xl border bg-card">
          {rows.map((r) => {
            const Icon = ICONS[r.kind]
            return (
              <li key={r.id} className="tv-rise flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border">
                  <Icon className="size-4 text-primary-ink" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-bold">{a.kinds[r.kind]}</span>
                    <span className="text-muted-foreground"> · {r.actor}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={new Date(r.at).toISOString()}>{formatDateTime(new Date(r.at).toISOString(), locale)}</time>
                    {r.hash ? (
                      <>
                        {" · "}
                        <span className="font-mono" title={r.hash}>
                          {shortHash(r.hash)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                {r.amount ? <Amount value={r.amount} token={vault.token} locale={locale} className="text-sm font-bold" /> : null}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
