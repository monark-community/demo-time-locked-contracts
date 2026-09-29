"use client"

import { ArrowRightIcon, CalendarClockIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { href } from "@/i18n/config"
import { t } from "@/i18n/t"
import { useDemo, useNow } from "@/lib/demo/store"
import { TOKEN_LIST } from "@/lib/demo/tokens"
import type { TokenSymbol, Vault } from "@/lib/demo/types"
import { claimableAt, isFunder, isRecipient, lockedAt, nextUnlock, statusAt, tranches } from "@/lib/demo/vesting"
import { formatDateShort, formatRelative } from "@/lib/format"

import { ActivityFeed } from "./activity"
import { AppLoading } from "./app-frame"
import { useAppCopy } from "./app-provider"
import { Amount, Countdown, scheduleLine, StatusBadge, VaultBar } from "./bits"

type Totals = Partial<Record<TokenSymbol, bigint>>

function add(totals: Totals, token: TokenSymbol, v: bigint) {
  if (v > 0n) totals[token] = (totals[token] ?? 0n) + v
}

export function Dashboard() {
  const demo = useDemo()
  const now = useNow()
  const { app, locale } = useAppCopy()
  const d = app.dashboard
  if (!demo || !now) return <AppLoading label={app.loading} />

  const me = demo.wallet.address
  const forYou = demo.vaults.filter((v) => isRecipient(v, me))
  const funded = demo.vaults.filter((v) => isFunder(v, me) && !isRecipient(v, me))

  const claimable: Totals = {}
  for (const v of forYou) add(claimable, v.token, claimableAt(v, now))
  const lockedOthers: Totals = {}
  const released: Totals = {}
  for (const v of funded) {
    add(lockedOthers, v.token, lockedAt(v, now))
    add(released, v.token, BigInt(v.claimed))
  }

  // Soonest discrete unlock across every vault.
  let next: { vault: Vault; at: number } | null = null
  for (const v of demo.vaults) {
    const n = nextUnlock(v, now)
    if (!n || n.continuous) continue
    const at = new Date(n.at).getTime()
    if (!next || at < next.at) next = { vault: v, at }
  }

  const upcoming = demo.vaults
    .flatMap((v) =>
      v.revokedAt
        ? []
        : tranches(v)
            // Gradual schedules only have one discrete moment worth listing: the cliff.
            .filter((tr) => new Date(tr.at).getTime() > now && (v.schedule.kind !== "linear" || (!!v.schedule.cliff && tr.index === 1)))
            .slice(0, 2)
            .map((tr) => ({ vault: v, at: new Date(tr.at).getTime(), amount: tr.amount }))
    )
    .sort((a, b) => a.at - b.at)
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-display sm:text-4xl">{d.title}</h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">{d.intro}</p>
        </div>
        <Button asChild size="lg" className="self-start sm:self-auto">
          <Link href={href(locale, "/app/new")}>
            <PlusIcon aria-hidden="true" />
            {d.create}
          </Link>
        </Button>
      </header>

      <section aria-label={d.title} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label={d.summary.claimable} totals={claimable} emphasis />
        <SummaryCard label={d.summary.lockedOthers} totals={lockedOthers} />
        <div className="col-span-2 flex flex-col justify-between gap-2 rounded-2xl border bg-card p-4 lg:col-span-1">
          <p className="text-xs font-bold text-muted-foreground">{d.summary.next}</p>
          {next ? (
            <div className="min-w-0">
              <Countdown target={next.at} now={now} app={app} className="text-xl" />
              <Link href={href(locale, `/app/vault/${next.vault.id}`)} className="mt-1 block truncate text-sm font-semibold underline-offset-4 hover:underline">
                {next.vault.name}
              </Link>
            </div>
          ) : (
            <p className="text-lg font-bold text-muted-foreground">{d.summary.nextNone}</p>
          )}
        </div>
        <SummaryCard label={d.summary.released} totals={released} hint={d.summary.releasedHint} className="col-span-2 lg:col-span-1" />
      </section>

      {demo.vaults.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">{d.empty}</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-8">
            <VaultSection title={d.forYou} empty={d.forYouEmpty} vaults={forYou} now={now} incoming />
            <VaultSection title={d.funded} empty={d.fundedEmpty} vaults={funded} now={now} />
          </div>

          <aside className="flex flex-col gap-8">
            <section aria-labelledby="upcoming-title">
              <h2 id="upcoming-title" className="text-lg font-bold">
                {d.upcoming}
              </h2>
              {upcoming.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{d.upcomingEmpty}</p>
              ) : (
                <ol className="mt-3 flex flex-col divide-y rounded-2xl border bg-card">
                  {upcoming.map((u, i) => (
                    <li key={`${u.vault.id}-${u.at}-${i}`}>
                      <Link
                        href={href(locale, `/app/vault/${u.vault.id}`)}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                      >
                        <span className="flex w-11 shrink-0 flex-col items-center rounded-xl border py-1 leading-none">
                          <CalendarClockIcon className="size-3.5 text-primary" aria-hidden="true" />
                          <span className="mt-1 text-[0.6875rem] font-bold whitespace-nowrap">{formatDateShort(u.at, locale)}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{u.vault.name}</span>
                          <span className="block text-xs text-muted-foreground">{formatRelative(u.at, now, locale)}</span>
                        </span>
                        <Amount value={u.amount} token={u.vault.token} locale={locale} className="text-sm font-bold" />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section aria-labelledby="activity-title">
              <h2 id="activity-title" className="text-lg font-bold">
                {d.activity}
              </h2>
              <ActivityFeed vaults={demo.vaults} now={now} limit={6} className="mt-3" />
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, totals, hint, emphasis, className }: { label: string; totals: Totals; hint?: string; emphasis?: boolean; className?: string }) {
  const { locale } = useAppCopy()
  const entries = TOKEN_LIST.filter((tk) => (totals[tk] ?? 0n) > 0n)
  return (
    <div className={`flex flex-col justify-between gap-2 rounded-2xl border bg-card p-4 ${emphasis ? "border-primary/60" : ""} ${className ?? ""}`}>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className="flex flex-col">
        {entries.length === 0 ? <span className="text-xl font-extrabold">0</span> : null}
        {entries.map((tk, i) => (
          <Amount key={tk} value={totals[tk]!} token={tk} locale={locale} className={i === 0 ? "text-xl font-extrabold" : "text-sm font-bold text-muted-foreground"} />
        ))}
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  )
}

function VaultSection({ title, empty, vaults, now, incoming }: { title: string; empty: string; vaults: Vault[]; now: number; incoming?: boolean }) {
  const id = incoming ? "for-you" : "funded"
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="flex items-baseline gap-2 text-xl font-bold">
        {title}
        <span className="text-sm font-semibold text-muted-foreground">{vaults.length}</span>
      </h2>
      {vaults.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {vaults.map((v) => (
            <li key={v.id}>
              <VaultRow vault={v} now={now} incoming={incoming} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function VaultRow({ vault, now, incoming }: { vault: Vault; now: number; incoming?: boolean }) {
  const { app, locale } = useAppCopy()
  const d = app.dashboard
  const status = statusAt(vault, now)
  const claimable = claimableAt(vault, now)
  const next = nextUnlock(vault, now)
  const counterpart = incoming ? t(d.from, { name: vault.funder.name }) : t(d.to, { name: vault.recipient.name })

  return (
    <Link
      href={href(locale, `/app/vault/${vault.id}`)}
      aria-label={t(d.open, { name: vault.name })}
      className="group block rounded-2xl border bg-card p-4 transition-colors hover:border-input sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{vault.name}</span>
            <StatusBadge status={status} app={app} />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {counterpart} · {scheduleLine(vault, app, locale)}
          </p>
        </div>
        <Amount value={vault.total} token={vault.token} locale={locale} className="text-lg font-extrabold" />
      </div>
      <VaultBar vault={vault} now={now} className="mt-4" />
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          {claimable > 0n ? (
            <span className="font-bold text-foreground">
              {app.bar.claimable}: <Amount value={claimable} token={vault.token} locale={locale} />
            </span>
          ) : next && !next.continuous ? (
            <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
              {app.countdown.label} <Countdown target={new Date(next.at).getTime()} now={now} app={app} className="text-foreground" />
            </span>
          ) : next?.continuous ? (
            app.countdown.continuous
          ) : (
            app.countdown.none
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
