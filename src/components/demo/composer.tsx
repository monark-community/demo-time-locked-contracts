"use client"

import { AlertCircleIcon, CalendarIcon, CoinsIcon, LockIcon, SparklesIcon, TrendingUpIcon, UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState, type ReactNode } from "react"

import { ScheduleChart } from "@/components/charts/schedule-chart"
import { Button } from "@/components/ui/button"
import { InfoTip } from "@/components/ui/info-tip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { href } from "@/i18n/config"
import { t } from "@/i18n/t"
import { useTx } from "@/lib/demo/chain"
import { isAddress, seededAddress } from "@/lib/demo/ids"
import { lockVault, type NewVault } from "@/lib/demo/ops"
import { useDemo, useNow } from "@/lib/demo/store"
import { parseUnits, TOKEN_LIST, TOKENS } from "@/lib/demo/tokens"
import type { Schedule, ScheduleKind, TokenSymbol } from "@/lib/demo/types"
import { addMonths, tranches } from "@/lib/demo/vesting"
import { formatDateLong, formatDateShort, formatToken } from "@/lib/format"
import { cn } from "@/lib/utils"

import { AppLoading } from "./app-frame"
import { useAppCopy } from "./app-provider"
import { Amount, scheduleLine } from "./bits"
import { TxFeedback } from "./tx-feedback"

type TemplateKey = "grant" | "stipend" | "bounty" | "pledge" | "blank"

interface Form {
  name: string
  purpose: string
  recipientName: string
  recipientAddress: string
  token: TokenSymbol
  amount: string
  kind: ScheduleKind
  start: string
  unlockDate: string
  steps: string
  duration: string
  cliff: string
  revocable: boolean
  approval: boolean
}

/** yyyy-mm-dd in local time, for <input type="date">. */
function dateInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** A date input value at 09:00 local, or now if it's today. */
function fromDateInput(value: string, now: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0, 0)
  if (value === dateInput(now)) return now
  return d.getTime()
}

const ICONS = { grant: TrendingUpIcon, stipend: CalendarIcon, bounty: SparklesIcon, pledge: CoinsIcon, blank: LockIcon }

export function Composer() {
  const demo = useDemo()
  const now = useNow()
  if (!demo || !now) {
    return <ComposerLoading />
  }
  return <ComposerForm today={now} />
}

function ComposerLoading() {
  const { app } = useAppCopy()
  return <AppLoading label={app.loading} />
}

function ComposerForm({ today }: { today: number }) {
  const demo = useDemo()!
  const now = useNow() ?? today
  const router = useRouter()
  const { app, locale } = useAppCopy()
  const c = app.composer
  const tx = useTx()
  const uid = useId()

  const blank: Form = {
    name: "",
    purpose: "",
    recipientName: "",
    recipientAddress: "",
    token: "tUSDC",
    amount: "",
    kind: "monthly",
    start: dateInput(today),
    unlockDate: dateInput(today + 30 * 86_400_000),
    steps: "6",
    duration: "12",
    cliff: "0",
    revocable: true,
    approval: false,
  }
  const [form, setForm] = useState<Form>(blank)
  const [template, setTemplate] = useState<TemplateKey>("blank")
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  const applyTemplate = (key: TemplateKey) => {
    setTemplate(key)
    tx.reset()
    if (key === "blank") {
      setForm(blank)
      return
    }
    const v = c.templateValues[key]
    const base = { ...blank, name: v.name, purpose: v.purpose, recipientName: v.recipient, recipientAddress: seededAddress(v.recipient) }
    const presets: Record<Exclude<TemplateKey, "blank">, Partial<Form>> = {
      grant: { token: "tUSDC", amount: "12000", kind: "linear", duration: "12", cliff: "3", revocable: true, approval: false },
      stipend: { token: "tDAI", amount: "1800", kind: "monthly", steps: "6", revocable: true, approval: false },
      bounty: { token: "tUSDC", amount: "750", kind: "date", unlockDate: dateInput(today + 14 * 86_400_000), revocable: false, approval: true },
      pledge: { token: "tDAI", amount: "2500", kind: "date", unlockDate: dateInput(today + 45 * 86_400_000), revocable: false, approval: false },
    }
    setForm({ ...base, ...presets[key] })
  }

  // --- Derived values and validation -------------------------------------
  const token = TOKENS[form.token]
  const balance = BigInt(demo.wallet.balances[form.token])
  const amount = parseUnits(form.amount, token.decimals)
  const start = fromDateInput(form.start, now)
  const steps = Number(form.steps)
  const duration = Number(form.duration)
  const cliff = Number(form.cliff || "0")
  const unlockAt = fromDateInput(form.unlockDate, now)

  const errors: Partial<Record<keyof Form, string>> = {}
  if (!form.name.trim()) errors.name = c.errors.name
  if (!form.recipientName.trim()) errors.recipientName = c.errors.recipientName
  if (!isAddress(form.recipientAddress)) errors.recipientAddress = c.errors.address
  else if (form.recipientAddress.trim().toLowerCase() === demo.wallet.address.toLowerCase()) errors.recipientAddress = c.errors.addressSelf
  if (amount === null) errors.amount = c.errors.amount
  else if (amount <= 0n) errors.amount = c.errors.amountZero
  else if (amount > balance) errors.amount = t(c.errors.balance, { amount: formatToken(balance, form.token, locale) })
  if (start === null || start < now - 86_400_000) errors.start = c.errors.start
  if (form.kind === "date" && (unlockAt === null || start === null || unlockAt <= start)) errors.unlockDate = c.errors.date
  if (form.kind === "monthly" && !(Number.isInteger(steps) && steps >= 2 && steps <= 36)) errors.steps = c.errors.steps
  if (form.kind === "linear") {
    if (!(Number.isInteger(duration) && duration >= 1 && duration <= 60)) errors.duration = c.errors.duration
    else if (!(Number.isInteger(cliff) && cliff >= 0 && cliff < duration)) errors.cliff = c.errors.cliff
  }
  const valid = Object.keys(errors).length === 0
  const show = (k: keyof Form) => (submitted ? errors[k] : undefined)

  // The schedule as it would be locked (usable for the preview as soon as the dates are valid).
  let schedule: Schedule | null = null
  if (start !== null) {
    const s = new Date(start)
    if (form.kind === "date" && unlockAt !== null && unlockAt > start) {
      schedule = { kind: "date", start: s.toISOString(), end: new Date(unlockAt).toISOString(), cliff: null, steps: 1 }
    } else if (form.kind === "monthly" && !errors.steps) {
      schedule = { kind: "monthly", start: s.toISOString(), end: addMonths(s, steps).toISOString(), cliff: null, steps }
    } else if (form.kind === "linear" && !errors.duration && !errors.cliff) {
      schedule = {
        kind: "linear",
        start: s.toISOString(),
        end: addMonths(s, duration).toISOString(),
        cliff: cliff > 0 ? addMonths(s, cliff).toISOString() : null,
        steps: 1,
      }
    }
  }
  const previewTotal = amount && amount > 0n ? amount.toString() : null
  const previewTranches = schedule && previewTotal ? tranches({ schedule, total: previewTotal }) : []

  const submit = () => {
    setSubmitted(true)
    if (!valid || !schedule || !amount) {
      // Errors are shown inline; move focus to the first one rather than raising a toast over the form.
      window.setTimeout(() => {
        const first = document.querySelector<HTMLElement>("form [aria-invalid='true']")
        first?.focus()
        first?.scrollIntoView({ block: "center", behavior: "smooth" })
      }, 0)
      return
    }
    const reviewers = [
      { name: demo.wallet.name, address: demo.wallet.address, isYou: true },
      { name: "Kwame Mensah", address: seededAddress("Kwame Mensah") },
      { name: "Inès Morel", address: seededAddress("Inès Morel") },
    ]
    const input: NewVault = {
      name: form.name.trim(),
      purpose: form.purpose.trim(),
      token: form.token,
      total: amount.toString(),
      recipient: { name: form.recipientName.trim(), address: form.recipientAddress.trim() },
      schedule,
      revocable: form.revocable,
      approval: form.approval ? { required: 2, reviewers, approvals: [] } : null,
    }
    const amountText = formatToken(amount, form.token, locale)
    const first = previewTranches[0]
    void tx.run(
      {
        title: t(c.submit, { amount: amountText }),
        rows: [
          { label: app.summaries.rowRecipient, value: input.recipient.name },
          { label: app.summaries.rowSchedule, value: scheduleLine({ schedule, total: input.total, token: form.token }, app, locale) },
          ...(first ? [{ label: app.summaries.rowFirst, value: formatDateLong(first.at, locale) }] : []),
        ],
        movesValue: true,
      },
      (hash) => {
        // The vault page confirms the creation inline (see VaultView), so no toast here.
        const id = lockVault(input, hash)
        router.push(href(locale, `/app/vault/${id}`))
      }
    )
  }

  const templates: TemplateKey[] = ["grant", "stipend", "bounty", "pledge", "blank"]
  const kinds: ScheduleKind[] = ["date", "monthly", "linear"]
  const fid = (k: string) => `${uid}-${k}`

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold tracking-display sm:text-4xl">{c.title}</h1>

      <section aria-labelledby="tpl-title">
        <h2 id="tpl-title" className="text-sm font-bold">
          {c.templatesTitle}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {templates.map((k) => {
            const Icon = ICONS[k]
            const active = template === k
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                onClick={() => applyTemplate(k)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border bg-card p-3.5 text-left transition-colors",
                  active ? "border-primary ring-1 ring-primary" : "hover:border-input"
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", active ? "text-primary-ink" : "text-muted-foreground")} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold">{c.templates[k].label}</span>
                  <span className="block text-xs text-muted-foreground">{c.templates[k].hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Fieldset legend={c.sections.about}>
            <Field id={fid("name")} label={c.fields.name} error={show("name")}>
              <Input id={fid("name")} value={form.name} placeholder={c.fields.namePh} onChange={(e) => set("name", e.target.value)} aria-invalid={!!show("name")} aria-describedby={show("name") ? `${fid("name")}-err` : undefined} />
            </Field>
            <Field id={fid("purpose")} label={c.fields.purpose}>
              <Input id={fid("purpose")} value={form.purpose} placeholder={c.fields.purposePh} onChange={(e) => set("purpose", e.target.value)} />
            </Field>
          </Fieldset>

          <Fieldset legend={c.sections.recipient} icon={<UserIcon className="size-4" aria-hidden="true" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={fid("rname")} label={c.fields.recipientName} error={show("recipientName")}>
                <Input id={fid("rname")} value={form.recipientName} placeholder={c.fields.recipientNamePh} onChange={(e) => set("recipientName", e.target.value)} aria-invalid={!!show("recipientName")} aria-describedby={show("recipientName") ? `${fid("rname")}-err` : undefined} />
              </Field>
              <Field id={fid("raddr")} label={c.fields.recipientAddress} error={show("recipientAddress")}>
                <Input
                  id={fid("raddr")}
                  value={form.recipientAddress}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-sm"
                  onChange={(e) => set("recipientAddress", e.target.value)}
                  aria-invalid={!!show("recipientAddress")}
                  aria-describedby={show("recipientAddress") ? `${fid("raddr")}-err` : undefined}
                />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend={c.sections.amount} icon={<CoinsIcon className="size-4" aria-hidden="true" />}>
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <Field id={fid("token")} label={c.fields.token}>
                <select
                  id={fid("token")}
                  value={form.token}
                  onChange={(e) => set("token", e.target.value as TokenSymbol)}
                  className="h-10 w-full rounded-full border border-input bg-transparent px-4 text-sm font-semibold"
                >
                  {TOKEN_LIST.map((tk) => (
                    <option key={tk} value={tk}>
                      {tk}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={fid("amount")} label={c.fields.amount} error={show("amount")}>
                <div className="flex gap-2">
                  <Input
                    id={fid("amount")}
                    inputMode="decimal"
                    value={form.amount}
                    placeholder="0"
                    className="tabular"
                    onChange={(e) => set("amount", e.target.value)}
                    aria-invalid={!!show("amount")}
                    aria-describedby={`${fid("amount")}-bal${show("amount") ? ` ${fid("amount")}-err` : ""}`}
                  />
                  <Button type="button" variant="outline" className="shrink-0" onClick={() => set("amount", formatToken(balance, form.token, "en", 6).replace(/[^\d.]/g, ""))}>
                    {c.fields.max}
                  </Button>
                </div>
                <p id={`${fid("amount")}-bal`} className="text-xs text-muted-foreground">
                  {t(c.fields.balance, { amount: formatToken(balance, form.token, locale, 4) })}
                </p>
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend={c.sections.schedule} icon={<CalendarIcon className="size-4" aria-hidden="true" />}>
            <div role="group" aria-label={c.fields.kind} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={form.kind === k}
                  onClick={() => set("kind", k)}
                  className={cn(
                    "rounded-2xl border p-3 text-left text-sm transition-colors",
                    form.kind === k ? "border-primary bg-primary/10 font-bold" : "hover:border-input"
                  )}
                >
                  {app.kinds[k]}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={fid("start")} label={c.fields.start} error={show("start")}>
                <Input id={fid("start")} type="date" min={dateInput(now)} value={form.start} onChange={(e) => set("start", e.target.value)} aria-invalid={!!show("start")} />
              </Field>
              {form.kind === "date" ? (
                <Field id={fid("unlock")} label={c.fields.unlockDate} error={show("unlockDate")}>
                  <Input id={fid("unlock")} type="date" min={form.start} value={form.unlockDate} onChange={(e) => set("unlockDate", e.target.value)} aria-invalid={!!show("unlockDate")} />
                </Field>
              ) : null}
              {form.kind === "monthly" ? (
                <Field id={fid("steps")} label={c.fields.steps} info={c.fields.stepsHint} error={show("steps")}>
                  <Input id={fid("steps")} type="number" inputMode="numeric" min={2} max={36} value={form.steps} onChange={(e) => set("steps", e.target.value)} aria-invalid={!!show("steps")} />
                </Field>
              ) : null}
              {form.kind === "linear" ? (
                <Field id={fid("duration")} label={c.fields.duration} error={show("duration")}>
                  <Input id={fid("duration")} type="number" inputMode="numeric" min={1} max={60} value={form.duration} onChange={(e) => set("duration", e.target.value)} aria-invalid={!!show("duration")} />
                </Field>
              ) : null}
            </div>
            {form.kind === "linear" ? (
              <Field id={fid("cliff")} label={c.fields.cliff} info={c.fields.cliffHint} error={show("cliff")}>
                <Input id={fid("cliff")} type="number" inputMode="numeric" min={0} max={59} value={form.cliff} className="sm:max-w-40" onChange={(e) => set("cliff", e.target.value)} aria-invalid={!!show("cliff")} />
              </Field>
            ) : null}
          </Fieldset>

          <Fieldset legend={c.sections.conditions}>
            <Toggle id={fid("revocable")} label={c.fields.revocable} hint={c.fields.revocableHint} checked={form.revocable} onChange={(v) => set("revocable", v)} />
            <Toggle id={fid("approval")} label={c.fields.approval} hint={c.fields.approvalHint} checked={form.approval} onChange={(v) => set("approval", v)} />
          </Fieldset>

          <div className="flex flex-col gap-3 lg:hidden">
            <SubmitArea tx={tx} amount={amount} token={form.token} onRetry={submit} />
          </div>
        </form>

        <aside aria-labelledby="preview-title" className="flex flex-col gap-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border bg-card p-4 sm:p-5">
            <h2 id="preview-title" className="text-lg font-bold">
              {c.preview.title}
            </h2>
            {schedule && previewTotal ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Amount value={previewTotal} token={form.token} locale={locale} className="font-bold text-foreground" /> ·{" "}
                  {scheduleLine({ schedule, total: previewTotal, token: form.token }, app, locale)}
                </p>
                <ScheduleChart
                  schedule={schedule}
                  total={previewTotal}
                  cut={now}
                  size="md"
                  className="mt-3"
                  label={scheduleLine({ schedule, total: previewTotal, token: form.token }, app, locale)}
                  markers={schedule.cliff ? [{ at: new Date(schedule.cliff).getTime(), label: app.vault.chart.cliff, tone: "cliff" }] : []}
                  ticks={[
                    { at: new Date(schedule.start).getTime(), label: formatDateShort(schedule.start, locale) },
                    { at: new Date(schedule.end).getTime(), label: formatDateShort(schedule.end, locale) },
                  ]}
                />
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold text-muted-foreground">{c.preview.firstUnlock}</dt>
                    <dd className="font-semibold">{previewTranches[0] ? formatDateShort(previewTranches[0].at, locale) : "–"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-muted-foreground">{c.preview.fullyUnlocked}</dt>
                    <dd className="font-semibold">{formatDateShort(schedule.end, locale)}</dd>
                  </div>
                </dl>
                {schedule.kind !== "linear" ? (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-muted-foreground">{c.preview.upcoming}</h3>
                    <ol className="mt-2 flex flex-col gap-1.5 text-sm">
                      {previewTranches.slice(0, 3).map((tr) => (
                        <li key={tr.index} className="flex justify-between gap-3">
                          <span>{formatDateLong(tr.at, locale)}</span>
                          <Amount value={tr.amount} token={form.token} locale={locale} className="font-semibold" />
                        </li>
                      ))}
                      {previewTranches.length > 3 ? <li className="text-xs text-muted-foreground">{t(c.preview.more, { n: previewTranches.length - 3 })}</li> : null}
                    </ol>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-3 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{c.preview.empty}</p>
            )}
          </div>
          <div className="hidden flex-col gap-3 lg:flex">
            <SubmitArea tx={tx} amount={amount} token={form.token} onRetry={submit} onSubmit={submit} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function SubmitArea({
  tx,
  amount,
  token,
  onRetry,
  onSubmit,
}: {
  tx: ReturnType<typeof useTx>
  amount: bigint | null
  token: TokenSymbol
  onRetry: () => void
  onSubmit?: () => void
}) {
  const { app, locale } = useAppCopy()
  const c = app.composer
  const label = amount && amount > 0n ? t(c.submit, { amount: formatToken(amount, token, locale) }) : c.submitIdle
  return (
    <>
      <Button type={onSubmit ? "button" : "submit"} size="lg" className="w-full" disabled={tx.busy} onClick={onSubmit}>
        <LockIcon aria-hidden="true" />
        {label}
      </Button>
      <TxFeedback state={tx.state} pendingLabel={c.pending} revertedLabel={c.failed} onRetry={onRetry} onDismiss={tx.reset} />
    </>
  )
}

function Fieldset({ legend, icon, children }: { legend: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-6">
      <legend className="float-left mb-1 flex w-full items-center gap-2 text-base font-bold">
        {icon ? <span className="text-primary-ink">{icon}</span> : null}
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({ id, label, info, error, children }: { id: string; label: string; info?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-h-5 items-center gap-1">
        <Label htmlFor={id} className="text-sm font-bold">
          {label}
        </Label>
        {info ? (
          <InfoTip label={label} className="-my-2 size-8">
            {info}
          </InfoTip>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-destructive">
          <AlertCircleIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id} className="text-sm font-bold">
          {label}
        </Label>
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-hint`} />
    </div>
  )
}
