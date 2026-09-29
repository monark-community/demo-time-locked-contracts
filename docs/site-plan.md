# TimeVault by Monark: site plan

Status: shipped on `develop`. This plan describes what the site does and is kept in sync with the code.

- Product: **TimeVault**, Monark's vesting and delayed-release module (the Safe module family behind contributor rewards and grants).
- Authoritative description: https://www.monark.io/en/project/time-locked-contracts
- Branding: **Monark-branded** (`true`). `lovable-migration/monark-brand-guidelines.md` is binding.
- Stack: Next.js 16 (App Router, `src/`, TypeScript strict), pnpm, Tailwind CSS v4, shadcn/ui on the Monark UI registry, `lucide-react`.

---

## 1. Product brief

**Target user.** The person in a Monark community who has promised money to someone *later*:

- a working-group or DAO lead granting a contributor 12,000 tUSDC that should vest over a year, not arrive on day one;
- the treasurer of a student blockchain club paying an ambassador a monthly stipend for a term;
- a bounty reviewer holding a reward until the fix ships and two reviewers agree;
- a partner or sponsor pledging funds to a club's hackathon, released on the event date.

The second user is the **recipient**: the contributor who wants to know, without asking, exactly how much they will receive and when, and to claim it when it unlocks. The third is the **student or developer** learning how a time-locked contract works (Monark's education mission; the documentation page frames the project as Solidity + a dashboard).

**Core job to be done.** *"When I promise someone money in the future, lock it now so they can count on it, release it on the agreed schedule without me doing anything, and keep a fair way out if the deal ends early."*

**Domain concepts** (each one explained in plain words the first time the site uses it):

| Concept | Meaning in TimeVault |
|-|-|
| Vault | A small smart contract, with its own address, holding one amount of one token for one recipient on one schedule. |
| Funder | The wallet that locked the funds. Can revoke if the vault is revocable. |
| Recipient | The wallet the funds are for. Claims what has unlocked. |
| Schedule | When funds unlock. Three kinds: **on a date** (everything at once), **monthly steps** (equal tranches every month), **gradually** (a continuous, per-second unlock between a start and an end date). |
| Cliff | A waiting period before anything unlocks (e.g. 3 months), common in contributor vesting. |
| Tranche | One step of a monthly schedule (e.g. 300 tDAI on the 1st of each month). |
| Unlocked / claimable / claimed | Unlocked = what the schedule has released so far; claimed = what the recipient already withdrew; claimable = the difference, ready to withdraw now. |
| Revocable | The funder may stop the vault: what has already unlocked stays with the recipient, only the still-locked part returns to the funder. |
| Reviewer approval | A release condition: N of M named reviewers must approve before anything can be claimed (the documented "multi-approval" milestone). |
| Activity log | Every event (locked, claimed, approval, revoked) with time, actor and transaction hash, exportable to CSV. |
| Demo clock | The demo's simulated time. Real vaults take months; the visitor can fast-forward the clock to watch unlocks happen. |

**What the Lovable version got wrong or left out.**

- A generic dashboard on a blue-to-purple gradient with frosted cards and a fake "Growth rate +12.5%" tile. Nothing Monark, nothing about promises or time.
- Its seed data was dated 2024, so every "active" vault showed zero time remaining yet could never be unlocked. The countdown was the core idea, and it was frozen.
- Only one schedule (a single unlock date). The documented vesting, monthly/recurring releases, cliffs and multi-approval releases were missing.
- Only the funder's view. Recipients (who have the most to gain from transparency) could not see or claim anything; "Unlock funds" never appeared.
- Create form did nothing: no validation of addresses or balances, a "success" toast with no vault, no wallet, no pending or failed state, no audit log.
- Invalid mock addresses (`0x123ABC456def789GHI…`), token mix-ups (a "$25,000 BTC" vault), English only, no disclaimers, a banner stuck over the content.

## 2. Value proposition

**TimeVault lets Monark communities lock a promised payment today and release it on a schedule a contract enforces, so contributors can count on what they were promised and funders never have to run payroll by hand or hold money in between.**

Supporting benefits, as outcomes:

1. **Recipients know exactly what's coming, and when.** The schedule is public; the next unlock counts down to the second, and nobody has to ask.
2. **Payments arrive on time without anyone remembering.** Monthly steps and gradual vesting unlock on their own; the recipient claims whenever suits them.
3. **Commitments stay fair both ways.** If a contributor steps down, a revocable vault returns only what hasn't unlocked; bigger rewards wait until reviewers approve.

## 3. Hero

- **Headline** (8 words): *Lock it today. It unlocks when promised.*
  FR: *Verrouillé aujourd'hui, libéré au jour promis.*
- **Subheadline** (15 words, no eyebrow above the headline): *Grants, stipends and bounties held in a contract, released on a schedule everyone can see.*
  FR: *Bourses, allocations et primes gardées dans un contrat, libérées selon un calendrier visible par tous.*
- **Primary CTA:** "Launch the demo" / « Lancer la démo » → `/{locale}/app`.
- **Secondary CTA:** "How it works" / « Fonctionnement » → `/{locale}/how-it-works`.
- **Visual:** the **live vault**, built in code (SVG + React): a card for "Contributor grant · 12,000 tUSDC · 6 monthly steps". Six padlocked tranches stand as a staircase; a "today" line sweeps across the months; as it crosses each step, that tranche's padlock opens and the "Unlocked" figure ticks up to the next 2,000. It loops calmly (~9 s) and renders in its final half-way state for reduced motion. Product UI over photos because the staircase *is* the idea: money that becomes available step by step, on a date nobody can move. The mesh butterfly sits large and cropped behind it (see §8).

## 4. Page map

All routes live under `/{locale}` (`en`, `fr`). `/` and any locale-less path redirect to the visitor's preferred language (fallback English) via `src/proxy.ts`.

| Route | Purpose | Sections, in order |
|-|-|-|
| `/{locale}` | Home: explain the idea in 30 seconds and send people into the demo. | Hero with the live vault · Three schedules (on a date, monthly steps, gradually), each with a mini schedule chart · Who it's for (3 photo cards) · FAQ (4) · Closing call to action (heading + button) |
| `/{locale}/app` | The interactive demo: every vault you fund or receive. | Connect gate (when disconnected) · Summary strip (claimable for you, locked for others, next unlock with live countdown, claimed by recipients) · For you (vault rows with progress bars) · Funded by you · Upcoming unlocks rail · Recent activity |
| `/{locale}/app/new` | Create a vault. | Templates · Recipient · Amount and token (with wallet balance) · Schedule (kind, start, cliff, duration / steps / date) · Conditions (revocable, reviewer approval) · Live preview (schedule chart + first tranches) · Lock funds |
| `/{locale}/app/vault/[id]` | One vault: its schedule, figures, actions and history. | Header (name, status, parties, contract, network) · Figures (total, unlocked, claimable, still locked, next unlock countdown) · Schedule chart with the time scrubber · Actions (claim, approve, revoke, simulate recipient claim) · Tabs: Schedule (tranche table), Activity (log + CSV), Terms |
| `/{locale}/how-it-works` | For students, developers and careful funders: the mechanics. Justified because Monark's audience includes students learning how the contract works, and the documentation page frames the project as a Solidity + dashboard build. | One-line intro · The life of a vault (diagram) · The three schedules with a worked 12,000 tUSDC example and the formula · Cliffs, revocation and reviewer approval · Why recipients claim · Time on a blockchain (and the demo clock) · For developers (one line; the contract interface and how the demo mirrors it sit behind a "Show the contract interface" disclosure) · Call to action (heading + button) |
| `/{locale}/credits` | Photo, font and icon credits (required by the asset rules). | Photos · Type and icons · Monark brand assets |
| `/{locale}/pricing` | **Internal strategy review only.** Never linked, excluded from the sitemap, `noindex, nofollow`. | Price card "Free, part of Monark" · What it costs to run (gas only, 0% fee) · Partner deployments · Reasoning |
| 404 | Friendly not-found with the vertical Monark logo and links home and to the demo. | |

No `/use-cases` page: the three photo cards on the home page cover it. No `/developers` page: the developer section at the end of `/how-it-works` is enough for a demo.

**Header** (standard Monark navbar, guidelines §2 and §10): left, the butterfly mark + "TimeVault" on one line (no "by Monark"; accessible label "TimeVault, by Monark: home"), then *Overview*, *How it works*, *Demo* as text links (active one in `foreground`); right, the Demo chip, the EN/FR switch, the theme toggle and one primary action, *Launch demo* (inside `/app` it becomes the `connect-wallet` component). Below `lg`: brand + menu button; the sheet holds the links, the Demo chip, EN/FR, the theme toggle and the action.

**Footer** (three bands): product line + links (Overview, How it works, Demo, Credits) · "TimeVault is built by Monark", the Monark logo + tagline, links to the project page on monark.io and the GitHub repo, social icons · "© {year} Monark · Open source", "Demo · simulated data", photo credits link. The testnet disclaimer is not in the footer: it appears only in the wallet prompt of value-moving transactions (guidelines §11).

**App bar** (inside `/app` only; marketing pages have exactly one top bar, the header): one compact strip with the demo clock and *Fast-forward* menu on the left, and one pill on the right showing the network ("● Sepolia testnet", icon-only on phones) that opens the demo controls.

## 5. Feature highlights

| Feature | User benefit | Where it appears | Proven by flow |
|-|-|-|-|
| Three schedules (date, monthly steps, gradual) with cliffs | The release matches what was actually agreed | Home "schedules"; `/how-it-works`; composer | Flow 2 |
| Live countdown and schedule chart | Recipients see what's coming without asking | Home hero; dashboard; vault page | Flows 3, 4 |
| Demo clock and time scrubber | See months of unlocks in seconds; preview any date | App bar; vault page chart | Flow 3 |
| Claim by the recipient | Recipients withdraw when it suits them | Vault page; dashboard "For you" | Flow 3 |
| Reviewer approval before release | Nobody releases a reward alone | Home "who" card; `/how-it-works`; vault page | Flow 4 |
| Revocable vesting | A fair exit: unlocked stays, locked returns | `/how-it-works`; vault page | Flow 5 |
| Activity log and CSV export | Anyone can check every release later | Vault page Activity tab; dashboard | Flow 5 |

## 6. Key flows

All transactions go through a simulated wallet prompt ("Confirm in your wallet": action summary, estimated network fee, the testnet disclaimer, *Confirm* / *Reject*), then a pending state with a transaction hash (1.2–2.4 s, 3–6 s with "slow network"), then confirmed or failed. The demo controls let a visitor make the next transaction fail on-chain; rejecting in the wallet prompt always produces the "rejected" failure. Nothing moves in the UI until confirmation.

1. **Connect a wallet.** `/app` → "Connect demo wallet" → wallet prompt "Sign in to TimeVault" (no fee) → *pending* ("Waiting for signature…") → *connected*: header shows the `connect-wallet` chip (`0x3c9E…71aD`, "Noor (you)"). *Failed*: rejecting shows "You declined the sign-in request. Nothing was shared." with a retry.
2. **Create a vault.** `/app/new` → pick a template (Contributor vesting, Monthly stipend, Bounty reward, Sponsor pledge) or start blank → recipient name and address (validated `0x` + 40 hex, not your own) → token and amount (checked against your wallet balance) → schedule: on a date / monthly steps (number of months) / gradually (duration and optional cliff) → revocable switch, optional reviewer approval (2 of 3) → the live preview draws the schedule and lists the first unlocks → *Lock 12,000 tUSDC* → wallet prompt → *pending* ("Locking your funds…") → *confirmed*: redirect to the new vault with an inline "Vault created. The first unlock is {date}." banner, wallet balance reduced. Invalid fields are flagged inline and focus moves to the first one. *Failed*: "The deposit failed on the network. Your tokens never left your wallet." with *Try again*; form stays filled.
3. **Fast-forward and claim.** Dashboard → "Workshop honorarium" (for you, 600 tUSDC, unlocks in 3 days) → drag the time scrubber to preview the unlock date → *Fast-forward to this date* → the demo clock jumps, the padlock opens, 600 tUSDC becomes claimable → *Claim 600 tUSDC* → wallet prompt → *pending* → *confirmed*: claimable drains into "Claimed", receipt in Activity, balance up. *Before unlock*: the claim button is disabled with "Nothing to claim until {date}". *Failed*: "The claim failed. The funds are still in the vault and still claimable."
4. **Approve a conditional release.** "Bug bounty: wallet recovery fix" (1,500 tUSDC for Tomás, unlocks on a date, needs 2 of 3 reviewer approvals, Kwame has approved) → *Approve release* → wallet prompt → *pending* → *confirmed*: "2 of 3 approvals: release approved". Fast-forward past the date → *Simulate Tomás's claim* (the recipient claims from their own wallet, so no prompt for you) → *pending* → *confirmed*: completed. Until approved, the vault shows "Unlocked but waiting for approval" and nothing is claimable.
5. **Revoke and audit.** "Ambassador stipend, fall term" (Léa, 6 × 300 tDAI, revocable, 2 steps claimed) → *Revoke vault* → confirmation explaining "Léa keeps 600 tDAI already unlocked; 1,200 tDAI returns to you" → wallet prompt → *pending* → *revoked*: status "Revoked", chart cut at today, remaining tranches struck through. Then *Activity* tab → filter (all, locks, claims, approvals, revocations) → every row has time (locale format), actor, amount and transaction hash → *Export CSV*. Empty state on a new vault: "Nothing has happened since the funds were locked."

## 7. Content (EN / FR)

The shipped copy lives in `src/i18n/dictionaries/en.ts` and `fr.ts` (typed; French must satisfy the English shape). Draft copy for the main sections:

### Home

After the simplification pass (see `docs/simplification.md`): no eyebrows, one line per card, heading only per section.

| Slot | English | Français |
|-|-|-|
| H1 | Lock it today. It unlocks when promised. | Verrouillé aujourd'hui, libéré au jour promis. |
| Sub | Grants, stipends and bounties held in a contract, released on a schedule everyone can see. | Bourses, allocations et primes gardées dans un contrat, libérées selon un calendrier visible par tous. |
| CTAs | Launch the demo · How it works | Lancer la démo · Fonctionnement |
| Schedules H2 | Release money the way you agreed to | Versez l'argent comme convenu |
| On a date | Everything at once: a bounty, a pledge on event day. | Tout d'un coup : une prime, un engagement le jour J. |
| Monthly steps | The same amount each month: stipends, part-time pay. | Le même montant chaque mois : allocations, temps partiel. |
| Gradually | A little every second after a cliff: contributor vesting. | Un peu chaque seconde après l'attente : l'acquisition des contributeurs. |
| Who H2 | Built for people who keep their word | Pensé pour celles et ceux qui tiennent parole |
| Contributors | Watch your grant vest without asking the treasurer. | Suivez l'acquisition de votre bourse sans écrire au trésorier. |
| Student clubs | Set up a term of ambassador stipends once. | Réglez une fois les allocations d'ambassadeurs de la session. |
| Grants and sponsors | Pledge event funds, released on the day with reviewer sign-off. | Engagez des fonds, libérés le jour venu avec l'accord des réviseurs. |
| Closing | Lock your first vault in two minutes. / Launch the demo | Créez votre premier coffre en deux minutes. / Lancer la démo |

**FAQ** (4 questions, home page only; "why claim" and "timing" are answered on `/how-it-works`)

1. *Is this real money?* No. It's a testnet demo: simulated funds, and nothing leaves your browser. / *Est-ce de l'argent réel ?* Non. C'est une démo sur testnet : fonds simulés, rien ne quitte votre navigateur.
2. *What is a vault?* A small smart contract holding one amount for one person, on one schedule. / *Qu'est-ce qu'un coffre ?* Un petit contrat intelligent qui garde un montant pour une personne, selon un calendrier.
3. *What happens when a vault is revoked?* The recipient keeps what has unlocked. Only the still-locked part returns. / *Que se passe-t-il quand un coffre est révoqué ?* Le débloqué reste à la personne bénéficiaire. Seule la part verrouillée revient.
4. *Can the schedule change after locking?* No, the dates can't move. The funder can only revoke a revocable vault. / *Peut-on modifier le calendrier après coup ?* Non, les dates ne bougent pas. Le financeur peut seulement révoquer un coffre révocable.

### App: key strings

| Slot | English | Français |
|-|-|-|
| Connect gate | Open your vaults · A demo wallet. Nothing is signed for real. | Ouvrez vos coffres · Un portefeuille de démo. Rien n'est signé pour de vrai. |
| Dashboard H1 | Your vaults (no intro line) | Vos coffres |
| Summary | Claimable for you · Locked for others · Next unlock · Claimed by recipients | À réclamer pour vous · Verrouillé pour d'autres · Prochain déblocage · Réclamé par les bénéficiaires |
| Sections | For you · Funded by you · Upcoming unlocks (4) · Recent activity (4) | Pour vous · Financés par vous · Prochains déblocages · Activité récente |
| App bar | Demo clock · Fast-forward · network pill "Sepolia testnet" (opens Demo controls) | Horloge de démo · Avancer · pastille réseau (ouvre les Réglages de démo) |
| Scrubber | Preview a date (ⓘ how it works) · On {date}: {unlocked} unlocked, {locked} still locked · Fast-forward to this date | Prévisualiser une date · Le {date} : … · Avancer jusqu'à cette date |
| Status | Locked · Unlocking · Claimable · Waiting for approval · Completed · Revoked | Verrouillé · En déblocage · À réclamer · En attente d'approbation · Terminé · Révoqué |
| Claim | Claim {amount} · Nothing to claim until {date} | Réclamer {amount} · Rien à réclamer avant le {date} |
| Wallet prompt | Confirm in your wallet · Estimated network fee · Confirm · Reject | Confirmez dans votre portefeuille · Frais de réseau estimés · Confirmer · Refuser |
| Disclaimer (wallet prompt only) | Testnet demo · not financial advice · no real funds | Démo sur testnet · ceci n'est pas un conseil financier · aucun fonds réel |
| Pending | Waiting for the network… | En attente du réseau… |
| Lock failed | The deposit failed on the network. Your tokens never left your wallet. | Le dépôt a échoué sur le réseau. Vos jetons n'ont jamais quitté votre portefeuille. |
| Claim failed | The claim failed. The funds are still in the vault and still claimable. | La réclamation a échoué. Les fonds sont toujours dans le coffre et toujours réclamables. |
| Rejected | You rejected the request in your wallet. Nothing was sent. | Vous avez refusé la demande dans votre portefeuille. Rien n'a été envoyé. |
| Revoke confirm | {name} keeps {kept} already unlocked. {returned} still locked returns to you. This can't be undone. | {name} garde les {kept} déjà débloqués. Les {returned} encore verrouillés vous reviennent. C'est irréversible. |
| Empty dashboard | No vaults yet. | Aucun coffre pour l'instant. |
| Activity empty | Nothing has happened since the funds were locked. | Rien ne s'est passé depuis le verrouillage des fonds. |
| Unknown vault | We couldn't find this vault. + Back to your vaults | Ce coffre est introuvable. + Retour à vos coffres |

The complete list (validation, demo controls, tabs, info popovers, how-it-works and credits copy) is in the dictionaries.

## 8. Aesthetics (within the Monark guidelines)

Colour, type, logo, header and footer are fixed by the guidelines: cream / espresso tokens derived from `#f88d10` with `--surface-tint: 1` (the §3 token block pasted over `theme.json`), Nunito Sans 400/600/700/800, pill actions, 1rem cards, borders not shadows, flat orange only.

- **Layout and rhythm.** Home alternates wide statement bands with dense bands: hero (copy left, live vault right on desktop; stacked on mobile) → schedules (tinted band, three cards, each with a real mini chart drawn by the same code as the app) → photo cards → FAQ (single column, 68ch) → closing band. The branded section divider appears once. The app is a working tool: content + a right rail (upcoming unlocks, activity) on desktop, single column on mobile; the vault page leads with the figures and the chart, actions in a sticky side card on desktop.
- **Hero visual.** The live vault staircase (see §3).
- **Mesh butterfly.** Used once, on the home hero, large and cropped off the right edge at low opacity behind the live vault. Not used anywhere else.
- **Illustrations.** No reused Monark decorative illustrations beyond the mesh butterfly. The site draws its own flat orange line art: the schedule charts (hero, home cards, composer preview, vault page), the "life of a vault" diagram and the revocation diagram on `/how-it-works`. Padlock glyphs are Lucide `Lock` / `LockOpen`. No gradients, no glows.
- **Photography direction.** Warm, natural-light photos of real people building together: a developer at a café counter, three club members laughing over a laptop in a library, a community meetup in a brick-walled room in Montréal. Same warm grade, used only in "who it's for", each paired with a line of copy and the schedule it would use.
- **Signature moments.**
  1. **The time scrubber.** On a vault, drag the "preview" handle along the schedule: the unlocked area fills behind it, padlocks open as you pass each tranche, and the readout says what would be unlocked on that date. Let go and *Fast-forward to this date* makes it real for the demo.
  2. **The padlock opening.** When the demo clock crosses a tranche or an unlock date, that tranche's padlock swaps to open with a short (200 ms) lift, and the amount slides into "Claimable".
  3. **The live countdown.** The next unlock ticks down in days, hours, minutes and seconds (tabular numerals), on the dashboard and each vault; it turns into "Unlocked" the moment it reaches zero.
- All motion 150–250 ms ease-out (the hero loop is slower and explanatory), and everything respects `prefers-reduced-motion` (the hero renders its final state, countdowns still update their numbers).

## 9. Assets

| Asset | Purpose | Placement |
|-|-|-|
| `public/images/contributor.jpg` (Unsplash, Anthony Riera) | Contributors use case | Home "who it's for" |
| `public/images/club.jpg` (Unsplash, Priscilla Du Preez) | Student clubs use case | Home "who it's for" |
| `public/images/meetup.jpg` (Unsplash, charlesdeluvio) | Grants and sponsors use case | Home "who it's for" |
| `public/brand/*` Monark logos (standalone, horizontal light/dark, vertical) | Header pairing, footer, 404, favicon, wallet prompt | Shell |
| `public/brand/monark-mesh.svg` | Home hero decoration | Home hero only |
| `public/brand/socials/*.svg` | Footer social icons | Footer |
| Open Graph image | Generated with `next/og` per locale (staircase + headline) | Metadata |

Icons: Lucide only. Diagrams: built in JSX/SVG (schedule chart, live vault, life-of-a-vault, revocation split). Full credits in `docs/assets.md` and on `/credits`.

## 10. Pricing strategy

TimeVault is **free, included in the Monark bundle**. Reasons: it is community infrastructure Monark uses to pay its own contributors and grantees; a fee taken out of someone's vesting would undercut the trust the product exists to create; and it is open source. Recipients get 100% of what was locked (0% protocol fee); on a real network the only costs are gas for locking and claiming. Partners who need a supported deployment (custom chain, audit review, onboarding a grants programme) go through Monark's partnership programme, not a price list.

A designed `/{locale}/pricing` page exists **for internal review only**: not linked anywhere, excluded from `sitemap.xml`, `robots: { index: false, follow: false }`. No other page mentions prices.

## 11. Out of scope

- Real wallets, chains, signing or tokens (no wagmi/viem; the data layer in `src/lib/demo/` is shaped so it could be swapped in).
- Off-chain triggers and oracles (e.g. "release when the project ships"): mentioned on monark.io as a future extension; the demo's only non-time condition is reviewer approval.
- Batch vaults (one vault, many recipients), transferring a vault to a new recipient, custom intervals (weekly, quarterly), editing a vault after locking.
- Notifications, fiat, tax reporting, a backend, a `/brand` page or a blog.
- Moving the demo clock backwards: like real time, it only goes forward. "Reset demo" returns it to today.

## 12. Implementation notes (as shipped)

- `theme-2026.json` is not published, so the base comes from `theme.json` with the guidelines' §3 token block pasted over it in `src/app/globals.css`, plus muted `--success` / `--warning` status colours (always paired with a label).
- The shell (header, footer, locale switch, theme toggle), the registry-derived UI components and the simulated-transaction plumbing follow the same structure as the sister Monark site (Splitflow), so the family reads as one; the product, data model, pages, diagrams and copy are TimeVault's own.
- Dependencies beyond the stack: `next-themes` (theme toggle without a flash), `sonner` (toasts), `react-jazzicon` (required by the registry `wallet`); `playwright` as a dev dependency for `pnpm screenshots`. No recharts: the schedule charts are small SVGs drawn in code, which the scrubber needs anyway.
- **No toast ever covers the vault it reports on.** Claims, approvals and revocations confirm inline in the actions card (amount + transaction hash), clock moves update the clock and chart in place (announced to screen readers through a live region), and a new vault confirms with a banner on its page. The only toast left is "Demo reset", after the controls dialog closes.
- On phones the vault page puts the actions card right under the figures (before the chart), so the claim button is in reach without scrolling past the table.
- Amounts are shown with the site's own `Amount` formatter rather than the registry `token-amount`, because `token-amount` sets figures in monospace and the guidelines reserve monospace for addresses, hashes and code. The registry `wallet`, `connect-wallet`, `network-badge` and `tx-status` are used as is.
- The demo wallet holds 18,400 tUSDC, 3,200 tDAI and 1.85 tETH, so every template can be locked once.
- Screenshots live in `docs/screenshots/`: every page and all five flows at 390 and 1440 px, light and dark, in English; the home page, dashboard and the fast-forward-and-claim flow in French. The script reports any horizontal overflow.
- **Restraint pass** (guidelines §8): context in the app is on demand. `src/components/ui/info-tip.tsx` (a Radix popover behind an info icon; opens on tap, so it works on touch) carries the cliff and monthly-steps explanations in the composer, the scrubber hint, the reviewer-approval rule and "why no signature" on a simulated recipient claim. No intro paragraphs above page titles or forms. Before/after word counts and what moved are in `docs/simplification.md`; `node scripts/wordcount.mjs` and `node scripts/dictcount.mjs` re-measure.
- The FAQ uses native `<details>` (no JavaScript). Seeded example data is created in the visitor's language, with dates relative to the moment the demo is first opened (or reset), so countdowns are always live.
