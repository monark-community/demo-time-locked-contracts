"use client"

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, LockIcon, LockOpenIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { NetworkBadge } from "@/components/ui/network-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, WalletAddress } from "@/components/ui/wallet"
import { href } from "@/i18n/config"
import { t } from "@/i18n/t"
import { lastCreatedId } from "@/lib/demo/ops"
import { useDemo, useNow } from "@/lib/demo/store"
import { NETWORK_NAME } from "@/lib/demo/tokens"
import type { Party, Vault } from "@/lib/demo/types"
import { claimableAt, entitlement, isFunder, isRecipient, nextUnlock, scheduleUnlocked, statusAt, tranches, unlockedAt } from "@/lib/demo/vesting"
import { formatDateLong, formatDateTime, formatToken } from "@/lib/format"
import { cn } from "@/lib/utils"

import { ActivityLog } from "./activity"
import { AppLoading } from "./app-frame"
import { useAppCopy } from "./app-provider"
import { Amount, Countdown, scheduleLine, StatusBadge, VaultBar } from "./bits"
import { ScheduleExplorer } from "./schedule-explorer"
import { VaultActions } from "./vault-actions"

export function VaultView({ id }: { id: string }) {
  const demo = useDemo()
  const now = useNow()
  const { app, locale } = useAppCopy()
  const v = app.vault
  const [bannerClosed, setBannerClosed] = useState(false)
  if (!demo || !now) return <AppLoading label={app.loading} />

  const vault = demo.vaults.find((x) => x.id === id)
  if (!vault) {
    return (
      <section className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center py-12 text-center">
        <LockIcon className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-extrabold">{v.notFound.title}</h1>
        <p className="mt-2 text-muted-foreground">{v.notFound.body}</p>
        <Button asChild className="mt-6">
          <Link href={href(locale, "/app")}>{v.notFound.back}</Link>
        </Button>
      </section>
    )
  }

  const me = demo.wallet.address
  const status = statusAt(vault, now)
  const unlocked = unlockedAt(vault, now)
  const claimable = claimableAt(vault, now)
  const locked = entitlement(vault) - unlocked
  const next = nextUnlock(vault, now)
  const firstUnlock = tranches(vault)[0]
  const showCreated = !bannerClosed && lastCreatedId() === vault.id

  return (
    <div className="flex flex-col gap-6">
      {showCreated ? (
        <div role="status" className="tv-rise flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <p className="flex-1 font-semibold">
            {t(app.composer.created, { date: firstUnlock ? formatDateLong(firstUnlock.at, locale) : "" })}
          </p>
          <button type="button" onClick={() => setBannerClosed(true)} aria-label={app.close} className="-m-1 rounded-full p-1 text-muted-foreground hover:text-foreground">
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <div>
        <Link href={href(locale, "/app")} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {v.back}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-display sm:text-4xl">{vault.name}</h1>
          <StatusBadge status={status} app={app} />
        </div>
        {vault.purpose ? <p className="mt-2 max-w-[68ch] text-muted-foreground">{vault.purpose}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PartyChip label={v.funder} party={vault.funder} you={isFunder(vault, me)} />
          <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <PartyChip label={v.recipient} party={vault.recipient} you={isRecipient(vault, me)} />
        </div>
      </div>

      <section aria-label={v.figures.total} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Figure label={v.figures.total}>
          <Amount value={vault.total} token={vault.token} locale={locale} />
        </Figure>
        <Figure label={v.figures.unlocked}>
          <Amount value={unlocked} token={vault.token} locale={locale} />
          <span className="block text-xs font-semibold text-muted-foreground">
            {t(v.figures.claimed, { amount: formatToken(vault.claimed, vault.token, locale) })}
          </span>
        </Figure>
        <Figure label={v.figures.claimable} emphasis={claimable > 0n}>
          <Amount value={claimable} token={vault.token} locale={locale} />
        </Figure>
        <Figure label={v.figures.locked}>
          <Amount value={locked > 0n ? locked : 0n} token={vault.token} locale={locale} />
          {BigInt(vault.returned) > 0n ? (
            <span className="block text-xs font-semibold text-muted-foreground">
              {t(v.figures.returned, { amount: formatToken(vault.returned, vault.token, locale) })}
            </span>
          ) : null}
        </Figure>
        <div className="col-span-2 flex flex-col justify-between gap-1 rounded-2xl border bg-card p-4 lg:col-span-1">
          <p className="text-xs font-bold text-muted-foreground">{app.countdown.label}</p>
          {next && !next.continuous ? (
            <div>
              <Countdown target={new Date(next.at).getTime()} now={now} app={app} className="text-xl" />
              <p className="text-xs text-muted-foreground">{formatDateLong(next.at, locale)}</p>
            </div>
          ) : (
            <p className="text-sm font-bold">{next?.continuous ? app.countdown.continuous : app.countdown.none}</p>
          )}
        </div>
      </section>

      <div>
        <VaultBar vault={vault} now={now} className="h-3" />
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Legend swatch="bg-primary" label={app.bar.claimed} />
          <Legend swatch="border-2 border-primary bg-primary/25" label={app.bar.claimable} />
          <Legend swatch="relative overflow-hidden bg-muted" hatch label={app.bar.locked} />
          {BigInt(vault.returned) > 0n ? <Legend swatch="bg-muted-foreground/15" label={app.bar.returned} /> : null}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <ScheduleExplorer vault={vault} now={now} />

          <Tabs defaultValue="schedule" className="gap-4">
            <TabsList>
              <TabsTrigger value="schedule">{v.tabs.schedule}</TabsTrigger>
              <TabsTrigger value="activity">{v.tabs.activity}</TabsTrigger>
              <TabsTrigger value="terms">{v.tabs.terms}</TabsTrigger>
            </TabsList>
            <TabsContent value="schedule">
              <ScheduleTable vault={vault} now={now} />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityLog vault={vault} now={now} />
            </TabsContent>
            <TabsContent value="terms">
              <Terms vault={vault} />
            </TabsContent>
          </Tabs>
        </div>

        {/* On phones the actions come first, right under the figures. */}
        <div className="order-first lg:sticky lg:top-24 lg:order-none">
          <VaultActions vault={vault} now={now} me={me} />
        </div>
      </div>
    </div>
  )
}

function PartyChip({ label, party, you }: { label: string; party: Party; you: boolean }) {
  const { app } = useAppCopy()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">{label}</span>
      <Wallet
        address={party.address}
        name={you ? `${party.name} (${app.vault.you})` : party.name}
        size="sm"
        copyLabel={app.copy}
        copiedLabel={app.copied}
        className="max-w-[16rem]"
      />
    </div>
  )
}

function Figure({ label, children, emphasis }: { label: string; children: React.ReactNode; emphasis?: boolean }) {
  return (
    <div className={cn("flex flex-col justify-between gap-1 rounded-2xl border bg-card p-4", emphasis && "border-primary")}>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className="text-lg font-extrabold sm:text-xl">{children}</div>
    </div>
  )
}

function Legend({ swatch, label, hatch }: { swatch: string; label: string; hatch?: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className={cn("inline-block h-2.5 w-4 rounded-full", swatch)}>
        {hatch ? <span className="tv-hatch absolute inset-0" /> : null}
      </span>
      {label}
    </li>
  )
}

function ScheduleTable({ vault, now }: { vault: Vault; now: number }) {
  const { app, locale } = useAppCopy()
  const tb = app.vault.table
  const rows = tranches(vault)
  const stop = vault.revokedAt ? new Date(vault.revokedAt).getTime() : Infinity
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {app.kinds[vault.schedule.kind]} · {scheduleLine(vault, app, locale)}
      </p>
      {vault.schedule.kind === "linear" ? <p className="text-xs text-muted-foreground">{tb.checkpoints}</p> : null}
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-bold">{tb.n}</th>
              <th scope="col" className="px-4 py-2.5 font-bold">{tb.date}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-bold">{tb.amount}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-bold">{tb.cumulative}</th>
              <th scope="col" className="px-4 py-2.5 font-bold">{tb.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const at = new Date(r.at).getTime()
              const cancelled = at > stop
              const open = at <= now && !cancelled
              const cumulative = scheduleUnlocked(vault.schedule, BigInt(vault.total), at)
              return (
                <tr key={r.index} className={cn(cancelled && "text-muted-foreground line-through")}>
                  <td className="px-4 py-2.5 tabular">{r.index}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(r.at, locale)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Amount value={r.amount} token={vault.token} locale={locale} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    <Amount value={cumulative} token={vault.token} locale={locale} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("inline-flex items-center gap-1.5 font-semibold no-underline", open ? "text-primary-ink" : "text-muted-foreground")}>
                      {cancelled ? <XIcon className="size-3.5" aria-hidden="true" /> : open ? <LockOpenIcon className="size-3.5" aria-hidden="true" /> : <LockIcon className="size-3.5" aria-hidden="true" />}
                      {cancelled ? tb.cancelled : open ? tb.unlocked : tb.locked}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Terms({ vault }: { vault: Vault }) {
  const { app, locale } = useAppCopy()
  const tm = app.vault.terms
  const rows: [string, React.ReactNode][] = [
    [tm.kind, `${app.kinds[vault.schedule.kind]} · ${scheduleLine(vault, app, locale)}`],
    [tm.token, vault.token],
    [tm.start, formatDateTime(vault.schedule.start, locale)],
    [tm.end, formatDateTime(vault.schedule.end, locale)],
    [tm.cliff, vault.schedule.cliff ? formatDateTime(vault.schedule.cliff, locale) : tm.noCliff],
    [tm.revocable, vault.revocable ? tm.yes : tm.no],
    [tm.approval, vault.approval ? t(tm.approvalValue, { required: vault.approval.required, total: vault.approval.reviewers.length }) : tm.noApproval],
    [tm.created, formatDateTime(vault.createdAt, locale)],
    [
      app.vault.contract,
      <span key="c" className="flex flex-wrap items-center gap-2">
        <WalletAddress address={vault.address} className="text-sm" />
        <NetworkBadge name={NETWORK_NAME} variant="outline" icon={<span className="block size-full rounded-full bg-success" />} />
      </span>,
    ],
  ]
  return (
    <dl className="divide-y rounded-2xl border bg-card text-sm">
      {rows.map(([k, val]) => (
        <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="font-semibold text-muted-foreground">{k}</dt>
          <dd className="min-w-0">{val}</dd>
        </div>
      ))}
      {vault.approval ? (
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="font-semibold text-muted-foreground">{app.vault.actions.approvalsTitle}</dt>
          <dd className="flex flex-wrap gap-x-4 gap-y-1">
            {vault.approval.reviewers.map((r) => (
              <span key={r.address} className="inline-flex items-center gap-1">
                {vault.approval!.approvals.includes(r.address) ? <CheckIcon className="size-3.5 text-success" aria-hidden="true" /> : null}
                {r.name}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  )
}
