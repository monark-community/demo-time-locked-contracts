import Link from "next/link"

import { MONARK_SOCIALS, SiteFooter } from "@/components/ui/site-footer"
import { href, PROJECT_ID, REPO_URL, type Locale } from "@/i18n/config"
import type { Dictionary } from "@/i18n"

type SocialKey = keyof Dictionary["common"]["footer"]["social"]

/** The @monark/ui three-band footer with TimeVault's links and copy. */
export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const c = dict.common
  const f = c.footer
  return (
    <SiteFooter
      product={c.product}
      description={f.product}
      links={[
        { href: href(locale), label: c.nav.overview },
        { href: href(locale, "/how-it-works"), label: c.nav.how },
        { href: href(locale, "/app"), label: c.nav.demo },
        { href: href(locale, "/credits"), label: c.nav.credits },
      ]}
      resources={[
        { href: `https://www.monark.io/${locale}/project/${PROJECT_ID}`, label: f.projectPage },
        { href: REPO_URL, label: f.repo },
      ]}
      socials={MONARK_SOCIALS.map((s) => ({ ...s, label: f.social[s.key as SocialKey] ?? s.label }))}
      copyright={`© ${new Date().getFullYear()} ${f.legal}`}
      demoNotice={c.demoBadge}
      legalLinks={[{ href: href(locale, "/credits"), label: f.photos }]}
      LinkComponent={Link}
      labels={{
        productNav: f.productNav,
        builtBy: f.builtBy,
        monarkHome: f.monarkHome,
        tagline: f.tagline,
        socials: f.socialLabel,
      }}
    />
  )
}
