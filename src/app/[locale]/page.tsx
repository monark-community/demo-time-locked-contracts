import { ArrowRightIcon, CalendarCheck2Icon, EyeIcon, PlusIcon, ScaleIcon } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ScheduleChart } from "@/components/charts/schedule-chart"
import { HeroVault } from "@/components/home/hero-vault"
import { SectionDivider } from "@/components/site/section-divider"
import { Button } from "@/components/ui/button"
import { href, isLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n"
import type { Schedule } from "@/lib/demo/types"
import { pageMetadata } from "@/lib/metadata"
import { cn } from "@/lib/utils"

import clubImg from "../../../public/images/club.jpg"
import contributorImg from "../../../public/images/contributor.jpg"
import meetupImg from "../../../public/images/meetup.jpg"

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata(locale, "/", null, getDictionary(locale).meta.description)
}

const OUTCOME_ICONS = [EyeIcon, CalendarCheck2Icon, ScaleIcon]
const PHOTOS = [contributorImg, clubImg, meetupImg]

// Example schedules for the three cards: the same 12,000 tUSDC over a year, shown ~5 months in.
const Y0 = "2026-01-01T12:00:00.000Z"
const Y1 = "2027-01-01T12:00:00.000Z"
const EXAMPLES: Schedule[] = [
  { kind: "date", start: Y0, end: Y1, cliff: null, steps: 1 },
  { kind: "monthly", start: Y0, end: Y1, cliff: null, steps: 12 },
  { kind: "linear", start: Y0, end: Y1, cliff: "2026-04-01T12:00:00.000Z", steps: 1 },
]
const EXAMPLE_CUT = new Date("2026-06-10T12:00:00.000Z").getTime()

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const h = dict.home

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" aria-labelledby="hero-title">
        <Image
          src="/brand/monark-mesh.svg"
          alt=""
          width={569}
          height={571}
          unoptimized
          priority
          aria-hidden="true"
          className="pointer-events-none absolute top-40 -right-48 w-[30rem] max-w-none opacity-[0.09] select-none sm:-right-32 lg:-top-10 lg:-right-28 lg:w-[48rem] dark:opacity-[0.14]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24">
          <div>
            <p className="eyebrow text-primary-ink">{h.eyebrow}</p>
            <h1 id="hero-title" className="mt-4 text-[2.25rem] leading-[1.06] font-extrabold tracking-display sm:text-5xl lg:text-[3.75rem]">
              {h.title}
            </h1>
            <p className="mt-5 max-w-[34rem] text-lg text-muted-foreground sm:text-xl">{h.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href={href(locale, "/app")}>
                  {h.ctaPrimary}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={href(locale, "/how-it-works")}>{h.ctaSecondary}</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">{dict.common.disclaimer}</p>
          </div>
          <HeroVault locale={locale} copy={h.hero} />
        </div>
      </section>

      {/* Outcomes */}
      <section aria-labelledby="outcomes-title" className="border-y bg-secondary/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:py-20">
          <div>
            <h2 id="outcomes-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
              {h.outcomes.title}
            </h2>
            <p className="mt-4 text-muted-foreground">{h.outcomes.intro}</p>
          </div>
          <ol className="flex flex-col divide-y">
            {h.outcomes.items.map((item, i) => {
              const Icon = OUTCOME_ICONS[i] ?? EyeIcon
              return (
                <li key={item.title} className="grid grid-cols-[auto_1fr] gap-x-5 py-6 first:pt-0 last:pb-0">
                  <Icon className="mt-1 size-7 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  <div>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="mt-1.5 text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Schedules */}
      <section aria-labelledby="schedules-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary-ink">{h.schedules.eyebrow}</p>
          <h2 id="schedules-title" className="mt-3 text-3xl font-bold tracking-display sm:text-[2rem]">
            {h.schedules.title}
          </h2>
          <p className="mt-4 text-muted-foreground">{h.schedules.body}</p>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {h.schedules.items.map((item, i) => (
            <li key={item.title} className="flex flex-col rounded-3xl border bg-card p-6">
              <ScheduleChart
                schedule={EXAMPLES[i] ?? EXAMPLES[0]!}
                total="12000000000"
                cut={EXAMPLE_CUT}
                size="sm"
                label={`${item.title}: ${item.body}`}
                padlocks={i !== 1}
              />
              <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
              <p className="mt-2 flex-1 text-muted-foreground">{item.body}</p>
              <p className="mt-4 text-xs font-semibold text-muted-foreground">{item.example}</p>
            </li>
          ))}
        </ul>
        <Link
          href={href(locale, "/how-it-works")}
          className="mt-8 inline-flex min-h-11 items-center gap-1.5 font-bold text-primary-ink underline underline-offset-4"
        >
          {h.schedules.learnMore}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </section>

      <SectionDivider />

      {/* Who */}
      <section aria-labelledby="who-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="eyebrow text-primary-ink">{h.who.eyebrow}</p>
        <h2 id="who-title" className="mt-3 max-w-2xl text-3xl font-bold tracking-display sm:text-[2rem]">
          {h.who.title}
        </h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {h.who.items.map((item, i) => (
            <li
              key={item.title}
              className={cn("overflow-hidden rounded-3xl border bg-card", i === 0 && "md:col-span-2 md:grid md:grid-cols-[1.3fr_1fr]")}
            >
              <div className={cn("relative aspect-[3/2]", i === 0 && "md:aspect-auto md:min-h-80")}>
                <Image
                  src={PHOTOS[i] ?? contributorImg}
                  alt={item.alt}
                  fill
                  sizes={i === 0 ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 768px) 50vw, 100vw"}
                  placeholder="blur"
                  className="object-cover"
                />
              </div>
              <div className={cn("flex flex-col p-6", i === 0 && "md:justify-center md:p-10")}>
                <h3 className={cn("font-bold", i === 0 ? "text-2xl" : "text-xl")}>{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.body}</p>
                <p className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {item.schedule}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <SectionDivider />

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 id="faq-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
          {h.faq.title}
        </h2>
        <div className="mt-8 divide-y border-y">
          {h.faq.items.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 text-lg font-bold [&::-webkit-details-marker]:hidden">
                {item.q}
                <PlusIcon className="size-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="max-w-[68ch] pb-5 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="closing-title" className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-3xl border bg-card p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="closing-title" className="text-2xl font-bold tracking-display sm:text-3xl">
              {h.closing.title}
            </h2>
            <p className="mt-2 max-w-[56ch] text-muted-foreground">{h.closing.body}</p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href={href(locale, "/app")}>
              {h.closing.cta}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
