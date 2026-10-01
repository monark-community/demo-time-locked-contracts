import { ArrowRightIcon, HourglassIcon, LockIcon, LockOpenIcon, PlusIcon, UndoDotIcon, UserCheckIcon, WalletIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ScheduleChart } from "@/components/charts/schedule-chart"
import { SectionDivider } from "@/components/site/section-divider"
import { Button } from "@/components/ui/button"
import { href, isLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n"
import type { Schedule } from "@/lib/demo/types"
import { scheduleUnlocked } from "@/lib/demo/vesting"
import { formatToken } from "@/lib/format"
import { pageMetadata } from "@/lib/metadata"

export async function generateMetadata({ params }: PageProps<"/[locale]/how-it-works">): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const m = getDictionary(locale).meta.pages.how
  return pageMetadata(locale, "/how-it-works", m.title, m.description)
}

const Y0 = "2026-01-01T12:00:00.000Z"
const Y1 = "2027-01-01T12:00:00.000Z"
const TOTAL = "12000000000"
const EXAMPLES: Schedule[] = [
  { kind: "date", start: Y0, end: Y1, cliff: null, steps: 1 },
  { kind: "monthly", start: Y0, end: Y1, cliff: null, steps: 12 },
  { kind: "linear", start: Y0, end: Y1, cliff: "2026-04-01T12:00:00.000Z", steps: 1 },
]
const REVOKE_SCHEDULE: Schedule = { kind: "linear", start: Y0, end: Y1, cliff: "2026-04-01T12:00:00.000Z", steps: 1 }
const REVOKED_AT = new Date("2026-06-01T12:00:00.000Z").getTime()
const LIFE_ICONS = [LockIcon, HourglassIcon, LockOpenIcon, WalletIcon]

const INTERFACE = `interface ITimeVault {
    struct Schedule { uint8 kind; uint64 start; uint64 cliff; uint64 end; uint16 steps; }

    /// Deploys a vault and pulls \`total\` of \`token\` from the funder.
    function lock(address recipient, IERC20 token, uint256 total,
                  Schedule calldata schedule, bool revocable,
                  address[] calldata reviewers, uint8 required)
        external returns (address vault);

    function unlocked(uint64 at) external view returns (uint256);
    function claimable() external view returns (uint256);

    function claim() external;   // recipient only
    function approve() external; // named reviewers only
    function revoke() external;  // funder only, if revocable

    event Locked(address indexed funder, address indexed recipient, uint256 total);
    event Claimed(address indexed recipient, uint256 amount);
    event Approved(address indexed reviewer, uint8 count);
    event Revoked(uint256 kept, uint256 returned);
}`

export default async function HowItWorksPage({ params }: PageProps<"/[locale]/how-it-works">) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const w = getDictionary(locale).how
  const kept = scheduleUnlocked(REVOKE_SCHEDULE, BigInt(TOTAL), REVOKED_AT)

  return (
    <div className="flex flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 pt-12 pb-10 sm:px-6 lg:pt-16">
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-display sm:text-5xl">{w.title}</h1>
        <p className="mt-5 max-w-[68ch] text-lg text-muted-foreground">{w.intro}</p>
      </header>

      {/* Life of a vault */}
      <section aria-labelledby="life-title" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="life-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
          {w.life.title}
        </h2>
        <figure aria-label={w.life.diagramLabel} className="mt-8">
          <ol className="relative grid gap-6 md:grid-cols-4 md:gap-4">
            <span aria-hidden="true" className="absolute top-6 right-[12%] left-[12%] hidden h-0.5 bg-primary md:block" />
            <span aria-hidden="true" className="absolute top-6 bottom-6 left-6 w-0.5 bg-primary md:hidden" />
            {w.life.steps.map((s, i) => {
              const Icon = LIFE_ICONS[i] ?? LockIcon
              return (
                <li key={s.title} className="relative grid grid-cols-[3rem_1fr] gap-4 md:flex md:flex-col md:items-center md:text-center">
                  <span className="relative z-10 flex size-12 items-center justify-center rounded-full border-2 border-primary bg-background text-primary-ink">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold md:mt-3">
                      <span className="text-muted-foreground">{i + 1}. </span>
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3 md:justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-input px-3.5 py-1.5 text-sm font-semibold text-muted-foreground">
              <UserCheckIcon className="size-4 text-primary" aria-hidden="true" />
              {w.life.branchApprove}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-input px-3.5 py-1.5 text-sm font-semibold text-muted-foreground">
              <UndoDotIcon className="size-4 text-primary" aria-hidden="true" />
              {w.life.branchRevoke}
            </span>
          </div>
        </figure>
      </section>

      {/* Schedules */}
      <section aria-labelledby="sched-title" className="border-y bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="sched-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
            {w.schedules.title}
          </h2>
          <p className="mt-3 max-w-[68ch] text-muted-foreground">{w.schedules.body}</p>
          <ul className="mt-8 grid gap-4 lg:grid-cols-3">
            {w.schedules.items.map((s, i) => (
              <li key={s.title} className="flex flex-col rounded-3xl border bg-card p-6">
                <ScheduleChart
                  schedule={EXAMPLES[i] ?? EXAMPLES[0]!}
                  total={TOTAL}
                  cut={new Date(Y1).getTime() + 1}
                  size="sm"
                  padlocks={false}
                  label={`${s.title}. ${s.note}`}
                />
                <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.body}</p>
                <p className="mt-4 text-sm font-bold text-primary-ink">{s.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Conditions */}
      <section aria-labelledby="cond-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="cond-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
          {w.conditions.title}
        </h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <dl className="flex flex-col gap-6">
            {w.conditions.items.map((c) => (
              <div key={c.title}>
                <dt className="text-lg font-bold">{c.title}</dt>
                <dd className="mt-1.5 text-muted-foreground">{c.body}</dd>
              </div>
            ))}
          </dl>
          <figure className="rounded-3xl border bg-card p-5 sm:p-6">
            <ScheduleChart
              schedule={REVOKE_SCHEDULE}
              total={TOTAL}
              cut={REVOKED_AT}
              stopAt={REVOKED_AT}
              size="md"
              label={w.conditions.revokeLabel}
              markers={[{ at: REVOKED_AT, label: w.conditions.revokeAt, tone: "revoked" }]}
            />
            <div aria-hidden="true" className="mt-4 flex h-3 overflow-hidden rounded-full">
              <span className="h-full bg-primary" style={{ width: `${(Number(kept) / Number(TOTAL)) * 100}%` }} />
              <span className="relative h-full flex-1 bg-muted">
                <span className="tv-hatch absolute inset-0" />
              </span>
            </div>
            <figcaption className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-bold">
                <span className="mr-1.5 inline-block size-2.5 rounded-full bg-primary" aria-hidden="true" />
                {w.conditions.revokeKept} · {formatToken(kept, "tUSDC", locale, 0)}
              </span>
              <span className="font-semibold text-muted-foreground">
                {w.conditions.revokeReturned} · {formatToken(BigInt(TOTAL) - kept, "tUSDC", locale, 0)}
              </span>
            </figcaption>
            <p className="sr-only">{w.conditions.revokeLabel}</p>
          </figure>
        </div>
      </section>

      <SectionDivider />

      {/* Claim + time */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-display">{w.claim.title}</h2>
          <p className="mt-3 text-muted-foreground">{w.claim.body}</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-display">{w.time.title}</h2>
          <p className="mt-3 text-muted-foreground">{w.time.body}</p>
        </div>
      </section>

      {/* Developers */}
      <section aria-labelledby="dev-title" className="border-t bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="dev-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
            {w.dev.title}
          </h2>
          <p className="mt-3 max-w-[68ch] text-muted-foreground">{w.dev.body}</p>
          <details className="group mt-6">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-primary-ink [&::-webkit-details-marker]:hidden">
              <PlusIcon className="size-4 transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
              {w.dev.show}
            </summary>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
              <div className="min-w-0">
                <h3 className="text-sm font-bold">{w.dev.interfaceTitle}</h3>
                <pre className="mt-3 overflow-x-auto rounded-2xl border bg-card p-4 text-[0.8125rem] leading-relaxed">
                  <code className="font-mono">{INTERFACE}</code>
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-bold">{w.dev.mapTitle}</h3>
                <dl className="mt-3 flex flex-col divide-y rounded-2xl border bg-card">
                  {w.dev.map.map((m) => (
                    <div key={m.k} className="p-4">
                      <dt className="font-mono text-xs font-semibold text-primary-ink">{m.k}</dt>
                      <dd className="mt-1 text-sm text-muted-foreground">{m.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-3xl border bg-card p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold tracking-display sm:text-3xl">{w.cta.title}</h2>
          <Button asChild size="lg" className="shrink-0">
            <Link href={href(locale, "/app")}>
              {w.cta.button}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
