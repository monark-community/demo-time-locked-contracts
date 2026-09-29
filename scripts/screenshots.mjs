// Visual check of every page and key flow with Playwright.
// Usage: pnpm build && pnpm start -p 3142   (in another terminal)
//        pnpm screenshots                   (BASE_URL defaults to http://localhost:3142)
// Output: docs/screenshots/<locale>-<width>-<theme>-<name>.png
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const BASE = process.env.BASE_URL ?? "http://localhost:3142"
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url))
const ONLY = process.env.ONLY // optional filter on the variant, e.g. "en-390-light"

const sizes = { 390: { width: 390, height: 844 }, 1440: { width: 1440, height: 900 } }
const variants = []
for (const w of [390, 1440]) for (const theme of ["light", "dark"]) variants.push({ locale: "en", w, theme, full: true })
// French: home page and one key flow (fast-forward and claim), both widths, light.
for (const w of [390, 1440]) variants.push({ locale: "fr", w, theme: "light", full: false })

const L = {
  en: {
    connect: "Connect demo wallet",
    confirm: "Confirm",
    reject: "Reject",
    dashboard: "Your vaults",
    menu: "Open menu",
    controls: "Demo controls",
    failNext: "Fail the next transaction",
    pending: "Waiting for the network…",
    forward: "Fast-forward to this date",
    claim: /^Claim /,
  },
  fr: {
    connect: "Connecter le portefeuille de démo",
    confirm: "Confirmer",
    reject: "Refuser",
    dashboard: "Vos coffres",
    menu: "Ouvrir le menu",
    controls: "Réglages de démo",
    failNext: "Faire échouer la prochaine transaction",
    pending: "En attente du réseau…",
    forward: "Avancer jusqu'à cette date",
    claim: /^Réclamer /,
  },
}

async function newPage(browser, { locale, w, theme }) {
  const context = await browser.newContext({
    viewport: sizes[w],
    colorScheme: theme,
    locale: locale === "fr" ? "fr-CA" : "en-CA",
    timezoneId: "America/Toronto",
    reducedMotion: "no-preference",
    acceptDownloads: true,
  })
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t)
    } catch {}
  }, theme)
  const page = await context.newPage()
  return { context, page }
}

const shot = async (page, v, name, fullPage = false) => {
  const file = `${OUT}${v.locale}-${v.w}-${v.theme}-${name}.png`
  await page.waitForTimeout(300)
  // Guard against horizontal scroll: report anything wider than the viewport.
  const wide = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const out = []
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect()
      // Ignore content clipped on purpose (overflow hidden / scrollable containers).
      let clipped = false
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX
        if (o === "hidden" || o === "auto" || o === "scroll" || o === "clip") {
          clipped = true
          break
        }
      }
      if (!clipped && r.width > 0 && r.right > vw + 1) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(r.right)}`)
    }
    return out.slice(-5)
  })
  if (wide.length) console.log("  ! overflow:", wide.join(" | "))
  await page.screenshot({ path: file, fullPage })
  console.log("  ✓", `${v.locale}-${v.w}-${v.theme}-${name}`)
}

const isMobile = (v) => v.w < 768
const main = (page) => page.getByRole("main")
const dialog = (page) => page.getByRole("dialog")

async function confirmPrompt(page, v) {
  await dialog(page).waitFor()
  await dialog(page).getByRole("button", { name: L[v.locale].confirm, exact: true }).click()
}

async function connect(page, v, capture) {
  await page.goto(`${BASE}/${v.locale}/app`, { waitUntil: "networkidle" })
  const btn = main(page).getByRole("button", { name: L[v.locale].connect })
  await btn.waitFor()
  if (capture) await shot(page, v, "app-01-gate", true)
  await btn.click()
  await dialog(page).waitFor()
  if (capture) await shot(page, v, "flow1-connect-prompt")
  await confirmPrompt(page, v)
  await page.getByRole("heading", { level: 1, name: L[v.locale].dashboard, exact: true }).waitFor({ timeout: 10000 })
}

async function failNext(page, v) {
  await page.getByRole("button", { name: L[v.locale].controls }).click()
  await page.getByLabel(L[v.locale].failNext).click()
  await page.keyboard.press("Escape")
}

async function marketing(page, v) {
  const pages = v.full
    ? [
        ["home", ""],
        ["how-it-works", "/how-it-works"],
        ["credits", "/credits"],
        ["pricing", "/pricing"],
        ["404", "/this-page-does-not-exist"],
      ]
    : [["home", ""]]
  for (const [name, path] of pages) {
    await page.goto(`${BASE}/${v.locale}${path}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(name === "home" ? 3600 : 400) // let the hero sweep open a few padlocks
    await shot(page, v, `page-${name}`, true)
  }
  if (isMobile(v) && v.full) {
    await page.goto(`${BASE}/${v.locale}`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: L[v.locale].menu }).click()
    await dialog(page).waitFor()
    await shot(page, v, "page-mobile-menu")
  }
}

/** Flow 3: fast-forward and claim (also the French flow). */
async function claimFlow(page, v) {
  const l = L[v.locale]
  await page.goto(`${BASE}/${v.locale}/app/vault/honorarium-you`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await shot(page, v, "flow3-01-locked", true)
  const scrubber = page.locator("#scrubber")
  await scrubber.focus()
  await page.keyboard.press("End")
  await page.waitForTimeout(300)
  await scrubber.scrollIntoViewIfNeeded()
  await shot(page, v, "flow3-02-scrub-preview")
  await page.getByRole("button", { name: l.forward }).click()
  await page.getByRole("button", { name: l.claim }).waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, v, "flow3-03-claimable", true)
  await page.getByRole("button", { name: l.claim }).click()
  await dialog(page).waitFor()
  await shot(page, v, "flow3-04-claim-prompt")
  await confirmPrompt(page, v)
  await page.getByText(l.pending).first().waitFor()
  await shot(page, v, "flow3-05-claim-pending")
  await page.getByText(l.pending).first().waitFor({ state: "detached", timeout: 12000 })
  await page.waitForTimeout(400)
  await shot(page, v, "flow3-06-claimed")
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, v, "flow3-07-claimed-top", true)
}

async function appFlows(page, v) {
  // Flow 1: connect (gate + prompt captured inside connect()), then the rejected state.
  await connect(page, v, true)
  await shot(page, v, "app-02-dashboard", true)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("timevault-demo-v1"))
    s.wallet.status = "disconnected"
    localStorage.setItem("timevault-demo-v1", JSON.stringify(s))
  })
  await page.reload({ waitUntil: "networkidle" })
  await main(page).getByRole("button", { name: "Connect demo wallet" }).click()
  await dialog(page).getByRole("button", { name: "Reject" }).click()
  await page.getByText("You declined the sign-in request").waitFor()
  await shot(page, v, "flow1-connect-rejected")
  await main(page).getByRole("button", { name: "Connect demo wallet" }).click()
  await confirmPrompt(page, v)
  await page.getByRole("heading", { level: 1, name: "Your vaults", exact: true }).waitFor({ timeout: 10000 })

  // Demo controls and the demo clock menu.
  await page.getByRole("button", { name: "Demo controls" }).click()
  await dialog(page).waitFor()
  await shot(page, v, "app-03-demo-controls")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Fast-forward", exact: true }).click()
  await page.getByRole("menu").waitFor()
  await shot(page, v, "app-04-clock-menu")
  await page.keyboard.press("Escape")

  // Flow 2: create a vault (errors, template, failed deposit, then success).
  await page.goto(`${BASE}/${v.locale}/app/new`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await shot(page, v, "flow2-01-composer-blank", true)
  await page.getByRole("button", { name: /^Lock/ }).filter({ visible: true }).click()
  await page.waitForTimeout(300)
  await shot(page, v, "flow2-02-composer-errors", true)
  await page.getByRole("button", { name: /Contributor vesting/ }).click()
  await page.waitForTimeout(200)
  await shot(page, v, "flow2-03-composer-filled", true)
  await failNext(page, v)
  await page.getByRole("button", { name: /^Lock/ }).filter({ visible: true }).click()
  await dialog(page).waitFor()
  await shot(page, v, "flow2-04-lock-prompt")
  await confirmPrompt(page, v)
  await page.getByText("Locking your funds…").filter({ visible: true }).first().waitFor()
  await shot(page, v, "flow2-05-lock-pending")
  await page.getByText("Your tokens never left your wallet").filter({ visible: true }).first().waitFor({ timeout: 12000 })
  await page.getByText("Your tokens never left your wallet").filter({ visible: true }).first().scrollIntoViewIfNeeded()
  await shot(page, v, "flow2-06-lock-failed")
  await page.getByRole("button", { name: "Try again" }).filter({ visible: true }).first().click()
  await confirmPrompt(page, v)
  await page.getByRole("heading", { level: 1, name: /Contributor grant/ }).waitFor({ timeout: 12000 })
  await page.waitForTimeout(500)
  await shot(page, v, "flow2-07-created", true)

  // Flow 3: fast-forward and claim.
  await claimFlow(page, v)

  // Flow 4: approve a conditional release, fast-forward, the recipient claims.
  await page.goto(`${BASE}/${v.locale}/app/vault/bounty-tomas`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await shot(page, v, "flow4-01-awaiting", true)
  await page.getByRole("button", { name: "Approve release", exact: true }).click()
  await dialog(page).waitFor()
  await shot(page, v, "flow4-02-approve-prompt")
  await confirmPrompt(page, v)
  await page.getByText("Release approved").first().waitFor({ timeout: 12000 })
  await page.waitForTimeout(300)
  await shot(page, v, "flow4-03-approved", true)
  const scrub = page.locator("#scrubber")
  await scrub.focus()
  await page.keyboard.press("End")
  await page.getByRole("button", { name: "Fast-forward to this date" }).click()
  await page.getByRole("button", { name: /Simulate Tomás/ }).click()
  await page.getByText("Waiting for the network…").first().waitFor()
  await page.getByText("Waiting for the network…").first().waitFor({ state: "detached", timeout: 12000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, v, "flow4-04-completed", true)

  // Flow 5: revoke a stipend, then read and export the activity log.
  await page.goto(`${BASE}/${v.locale}/app/vault/stipend-lea`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await page.getByRole("button", { name: "Revoke vault" }).click()
  await page.getByText("Revoke this vault?").scrollIntoViewIfNeeded()
  await shot(page, v, "flow5-01-revoke-confirm")
  await page.getByRole("button", { name: /^Revoke and return/ }).click()
  await confirmPrompt(page, v)
  await page.getByText("Revoking…").first().waitFor()
  await shot(page, v, "flow5-02-revoke-pending")
  await page.getByText(/^Revoked on/).first().waitFor({ timeout: 12000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, v, "flow5-03-revoked", true)
  await page.getByRole("tab", { name: "Activity" }).click()
  await page.getByRole("tab", { name: "Activity" }).scrollIntoViewIfNeeded()
  await shot(page, v, "flow5-04-activity")
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export CSV" }).click()
  await download

  // Unknown vault (error state) and the dashboard after all flows.
  await page.goto(`${BASE}/${v.locale}/app/vault/does-not-exist`, { waitUntil: "networkidle" })
  await page.getByText("We couldn't find this vault.").waitFor()
  await shot(page, v, "app-05-unknown-vault")
  await page.goto(`${BASE}/${v.locale}/app`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1, name: "Your vaults" }).waitFor()
  await shot(page, v, "app-06-dashboard-after", true)
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
try {
  for (const v of variants) {
    const key = `${v.locale}-${v.w}-${v.theme}`
    if (ONLY && !key.includes(ONLY)) continue
    console.log(key)
    const { context, page } = await newPage(browser, v)
    try {
      await marketing(page, v)
      if (v.full) await appFlows(page, v)
      else {
        await connect(page, v, false)
        await shot(page, v, "app-02-dashboard", true)
        await claimFlow(page, v)
      }
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
