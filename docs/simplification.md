# Simplification pass

Owner feedback on the rebuilt demo sites: too loaded. Reduce text, give context only when needed, one top bar on marketing pages, demo banners only in the app. This pass applies the method piloted on TrustRate (`address-review-system/docs/simplification.md`, §4 checklist) to TimeVault. Binding rules: `monark-brand-guidelines.md` §8 "Restraint", §10 and §11.

How the numbers are measured (both scripts are in `scripts/`, run against `pnpm start -p 3142`):

- `node scripts/wordcount.mjs`: words per page, English, at 1440px. *Visible* is the `innerText` of `<main>`; *total* also counts closed disclosures and FAQ answers; *chrome* is everything outside `<main>` (header and footer). The app bar sits inside `<main>`. Dashboard and vault pages include seeded data (vault names, purposes, amounts).
- `node scripts/dictcount.mjs`: words of UI copy in `src/i18n/dictionaries/{en,fr}.ts`, per section.

## 1. Before

Inventory of what was loaded:

- **Shell.** Demo chip at `primary/12` in both themes (the standard is 8% light / 15% dark). Footer legal band carried the testnet line on every page. Footer product line was 17 words.
- **Home** (hero + 5 sections, 2 dividers). Hero eyebrow "Safe module · Monark", a 31-word subline and the testnet disclaimer under the buttons. "A promise with a clock in it" (outcomes: intro paragraph + 3 items of 15–20 words) restated the hero and the schedule cards. Schedules had an eyebrow, a 29-word intro, 17-word card bodies and an example line per card. "Who" had an eyebrow and 16–19-word bodies. FAQ: 6 questions with answers up to 40 words, two of them mechanics (why claim, timing). Closing had a 19-word body line.
- **How it works.** Eyebrow, 38-word intro, 17-word lead line under "The life of a vault", 25–30-word diagram steps, formula notes up to 30 words, condition bodies up to 45 words, "Why recipients claim" (50 words) and "Time on a blockchain" (68 words), the contract interface and code map always open, a CTA body line.
- **App.** The strip under the header held the demo clock, a network badge, the testnet disclaimer and a Demo controls button. The disclaimer also sat under the composer's lock button and at the bottom of every vault's actions card, so a lock or claim showed it two or three times. The gate had a paragraph plus three feature bullets. Dashboard and composer each had an intro paragraph. The composer had four permanent field hints (address, start, steps, cliff) and two long toggle hints. The vault page had an axis caption and a 20-word scrubber hint, a permanent reviewer-rule sentence, a "revoke" hint and a "simulate claim" hint. Empty/error states had two sentences. Demo controls hints were 8–16 words.

### Word counts per page (EN)

| Page | Visible in main | Total in main (incl. collapsed) | Chrome (header, footer) |
|-|-:|-:|-:|
| Home | 430 | 600 | 79 |
| How it works | 779 | 779 | 79 |
| Credits | 140 | 140 | 79 |
| 404 | 31 | 31 | 79 |
| App: connect gate | 57 | 57 | 80 |
| App: dashboard | 347 | 364 | 81 |
| App: new vault | 200 | 212 | 81 |
| App: vault (honorarium) | 182 | 187 | 81 |
| App: vault (bounty) | 221 | 226 | 81 |
| **Total** | **2,387** | **2,596** | **720** |

Dictionary copy: **EN 3,152 words** (meta 142 · common 148 · home 640 · how 675 · credits 105 · pricing 171 · app 1,174 · seed 96); **FR 3,498 words**.

## 2. What changed

No feature or flow was removed. Words and chrome were.

### Shell (brought to the current Splitflow reference)
- `brand.tsx`, `demo-chip.tsx`, `header.tsx`, `nav-links.tsx`, `mobile-menu.tsx`, `theme.tsx` now match `fee-distribution-system/src/components/site/` exactly: Demo chip `bg-primary/8 dark:bg-primary/15` with `primary-ink` text; links 28px after the brand with their own padding; 36px theme toggle (`icon-sm`), 44px in the mobile sheet.
- **Footer legal band:** testnet line removed; it keeps "© Monark · Open source", "Demo · simulated data" and the credits link. Product line 17 → 8 words. "TimeVault is built by Monark" opens the Monark band.
- **Marketing pages:** exactly one top bar (the header).

### Home (hero + 5 sections → hero + 4 sections)
- Hero: removed the eyebrow and the testnet line under the buttons; subline 31 → 15 words; secondary CTA "See how it works" → "How it works".
- **Removed the outcomes section** ("A promise with a clock in it"): it restated the hero (schedule visible to all) and the schedule cards; "fair both ways" is covered by the revocation FAQ and the reviewers "who" card. The schedules section takes its tinted band.
- Schedules: no eyebrow, no intro paragraph, card bodies 17 → 9 words, example lines removed (the "who" cards carry the schedule chips). Charts unchanged.
- Who: eyebrow removed; bodies 16–19 → 7–10 words.
- FAQ: 6 → 4 questions, answers ≤ 13 words. "Why do recipients claim?" and "How precise is the timing?" were already the "Why recipients claim" and "Time on a blockchain" sections of `/how-it-works`. This is the only FAQ on the site.
- Closing: heading + button (body removed). One section divider instead of two.

### How it works
- Eyebrow removed; intro 38 → 9 words; the lead line under "The life of a vault" removed.
- Diagram steps 25–30 → 7–10 words; schedule formula notes to one line each; condition bodies to 7–13 words.
- "Why recipients claim" 50 → 20 words; "Time on a blockchain" 68 → 18 words.
- For developers: 24 → 16-word line; the contract interface and the code map sit behind a "Show the contract interface" disclosure; map notes cut to 5–8 words.
- CTA: heading + button.

### App (`/app/...`)
- **One compact bar.** The testnet disclaimer and the separate network badge are gone. The bar holds the demo clock (+ *Fast-forward* menu) and one pill, "● Sepolia testnet" + sliders icon, that opens Demo controls. On phones the pill is icon-only and the clock shows the date only, so everything fits on one row at 390px in both languages.
- **Testnet line once per transaction:** only in the wallet prompt of value-moving transactions (lock, claim, revoke). Removed from under the composer's lock button and from the vault actions card.
- Connect gate: feature bullets removed; body 19 → 8 words.
- Dashboard: intro paragraph removed; "Released to date / claimed by recipients" became one label "Claimed by recipients"; upcoming unlocks and recent activity show 4 items (was 6).
- Composer: intro removed; address and start hints removed (the error message states the address format); the monthly-steps and cliff explanations moved into info popovers next to their labels; toggle hints cut to one short line each ("Unlocked funds stay with the recipient." / "2 of 3: you, Kwame Mensah, Inès Morel."); the lock button carries no disclaimer.
- Vault page: axis caption removed; the scrubber hint moved into an info popover next to "Preview a date"; the reviewer rule ("2 of 3 reviewers must approve…") moved into an info popover next to "Reviewer approval"; "Revoke vault" hint removed (the inline confirmation states exactly what stays and what returns); "why no signature" on a simulated recipient claim is an info popover; "not revocable" and "only the funder can revoke" lines shortened; the gradual-schedule table note cut to one line.
- Empty and error states: one line plus the next action ("No vaults yet.", "No unlocks ahead.", "We couldn't find this vault." + *Back to your vaults*). 404 body 17 → 7 words.
- Demo controls: hints ≤ 7 words; reset confirmation 18 → 8 words. The "Demo reset" toast stays (the dialog closes, and it is the only confirmation of that action).
- New shared component: `src/components/ui/info-tip.tsx` (from the pilot: Radix Popover behind an info icon, opens on click or tap).

French was rewritten to the same brevity in `src/i18n/dictionaries/fr.ts`; EN and FR keys stay identical (typed dictionary) and unused keys were removed.

## 3. After

### Word counts per page (EN)

| Page | Visible before | Visible after | Change | Total before | Total after | Chrome before | Chrome after |
|-|-:|-:|-:|-:|-:|-:|-:|
| Home | 430 | 191 | −56% | 600 | 240 | 79 | 60 |
| How it works | 779 | 281 | −64% | 779 | 439 | 79 | 60 |
| Credits | 140 | 119 | −15% | 140 | 119 | 79 | 60 |
| 404 | 31 | 21 | −32% | 31 | 21 | 79 | 60 |
| App: connect gate | 57 | 18 | −68% | 57 | 18 | 80 | 61 |
| App: dashboard | 347 | 288 | −17% | 364 | 305 | 81 | 62 |
| App: new vault | 200 | 125 | −38% | 212 | 129 | 81 | 62 |
| App: vault (honorarium) | 182 | 143 | −21% | 187 | 148 | 81 | 62 |
| App: vault (bounty) | 221 | 165 | −25% | 226 | 170 | 81 | 62 |
| **Total** | **2,387** | **1,351** | **−43%** | **2,596** | **1,589** | **720** | **549** |

Marketing pages alone (home, how it works, credits, 404): 1,380 → 612 visible words (−56%). Most of the remaining app words are data: vault names, parties, amounts, countdowns and activity rows.

Dictionary copy: **EN 3,152 → 2,196 words (−30%)**, **FR 3,498 → 2,430 (−31%)**. Per section (EN): meta 142 → 142 · common 148 → 130 · home 640 → 288 · how 675 → 335 · credits 105 → 84 · app 1,174 → 949 · pricing 171 → 171 (internal, unlinked page, left as is) · seed 96 → 96.

### Screenshots

- Before: `docs/screenshots/before/en-1440-light-page-home.png`, `docs/screenshots/before/en-1440-light-flow2-03-composer-filled.png`.
- After: `docs/screenshots/en-1440-light-page-home.png`, `docs/screenshots/en-1440-light-flow2-03-composer-filled.png`, and every other page and flow step in `docs/screenshots/` (EN 390/1440 light/dark, FR 390/1440 light). No screenshot file was renamed or removed.
