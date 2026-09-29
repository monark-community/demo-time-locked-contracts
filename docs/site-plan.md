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
- **Subheadline:** *TimeVault holds contributor grants, stipends and bounty rewards in a smart contract that releases them on a schedule everyone can see. No reminders, no chasing, no taking anyone's word for it.*
  FR: *TimeVault garde les bourses de contributeurs, les allocations et les primes dans un contrat intelligent qui les libère selon un calendrier visible par tous. Pas de rappels, pas de relances, pas besoin de croire qui que ce soit sur parole.*
- **Primary CTA:** "Launch the demo" / « Lancer la démo » → `/{locale}/app`.
- **Secondary CTA:** "See how it works" / « Voir le fonctionnement » → `/{locale}/how-it-works`.
- **Visual:** the **live vault**, built in code (SVG + React): a card for "Contributor grant · 12,000 tUSDC · 6 monthly steps". Six padlocked tranches stand as a staircase; a "today" line sweeps across the months; as it crosses each step, that tranche's padlock opens and the "Unlocked" figure ticks up to the next 2,000. It loops calmly (~9 s) and renders in its final half-way state for reduced motion. Product UI over photos because the staircase *is* the idea: money that becomes available step by step, on a date nobody can move. The mesh butterfly sits large and cropped behind it (see §8).

## 4. Page map

All routes live under `/{locale}` (`en`, `fr`). `/` and any locale-less path redirect to the visitor's preferred language (fallback English) via `src/proxy.ts`.

| Route | Purpose | Sections, in order |
|-|-|-|
| `/{locale}` | Home: explain the idea in 30 seconds and send people into the demo. | Hero with the live vault · Three outcomes · Three schedules (on a date, monthly steps, gradually), each with a mini schedule chart · Who locks with TimeVault (3 photo cards) · FAQ · Closing call to action |
| `/{locale}/app` | The interactive demo: every vault you fund or receive. | Connect gate (when disconnected) · Summary strip (claimable for you, locked for others, next unlock with live countdown, released to date) · For you (vault rows with progress bars) · Funded by you · Upcoming unlocks rail · Recent activity |
| `/{locale}/app/new` | Create a vault. | Templates · Recipient · Amount and token (with wallet balance) · Schedule (kind, start, cliff, duration / steps / date) · Conditions (revocable, reviewer approval) · Live preview (schedule chart + first tranches) · Lock funds |
| `/{locale}/app/vault/[id]` | One vault: its schedule, figures, actions and history. | Header (name, status, parties, contract, network) · Figures (total, unlocked, claimable, still locked, next unlock countdown) · Schedule chart with the time scrubber · Actions (claim, approve, revoke, simulate recipient claim) · Tabs: Schedule (tranche table), Activity (log + CSV), Terms |
| `/{locale}/how-it-works` | For students, developers and careful funders: the mechanics. Justified because Monark's audience includes students learning how the contract works, and the documentation page frames the project as a Solidity + dashboard build. | Intro · The life of a vault (diagram) · The three schedules with a worked 12,000 tUSDC example and the formula · Cliffs, revocation and reviewer approval · Why recipients claim · Time on a blockchain (and the demo clock) · For developers (contract interface + how the demo's data layer mirrors it) · Call to action |
| `/{locale}/credits` | Photo, font and icon credits (required by the asset rules). | Photos · Type and icons · Monark brand assets |
| `/{locale}/pricing` | **Internal strategy review only.** Never linked, excluded from the sitemap, `noindex, nofollow`. | Price card "Free, part of Monark" · What it costs to run (gas only, 0% fee) · Partner deployments · Reasoning |
| 404 | Friendly not-found with the vertical Monark logo and links home and to the demo. | |

No `/use-cases` page: the three photo cards on the home page cover it. No `/developers` page: the developer section at the end of `/how-it-works` is enough for a demo.

**Header** (standard Monark shell): "TimeVault by Monark" pairing → home · links: *Overview*, *How it works*, *Demo* (pill highlight on the active one) · EN/FR switch · theme toggle · primary pill *Launch demo*. Inside `/app` the primary action becomes the `connect-wallet` component and a "Demo · simulated data" badge appears. Mobile: pairing + menu button opening a full-height sheet.

**Footer** (three bands): product line + links (Overview, How it works, Demo, Credits) · Monark logo + tagline, links to the project page on monark.io and the GitHub repo, social icons · "© {year} Monark · Open source", "Demo · simulated data", the testnet disclaimer, photo credits link.

## 5. Feature highlights

| Feature | User benefit | Where it appears | Proven by flow |
|-|-|-|-|
| Three schedules (date, monthly steps, gradual) with cliffs | The release matches what was actually agreed | Home "schedules"; `/how-it-works`; composer | Flow 2 |
| Live countdown and schedule chart | Recipients see what's coming without asking | Home hero; dashboard; vault page | Flows 3, 4 |
| Demo clock and time scrubber | See months of unlocks in seconds; preview any date | App strip; vault page chart | Flow 3 |
| Claim by the recipient | Recipients withdraw when it suits them | Vault page; dashboard "For you" | Flow 3 |
| Reviewer approval before release | Nobody releases a reward alone | Home outcomes; `/how-it-works`; vault page | Flow 4 |
| Revocable vesting | A fair exit: unlocked stays, locked returns | `/how-it-works`; vault page | Flow 5 |
| Activity log and CSV export | Anyone can check every release later | Vault page Activity tab; dashboard | Flow 5 |

## 6. Key flows

All transactions go through a simulated wallet prompt ("Confirm in your wallet": action summary, estimated network fee, the testnet disclaimer, *Confirm* / *Reject*), then a pending state with a transaction hash (1.2–2.4 s, 3–6 s with "slow network"), then confirmed or failed. The demo controls let a visitor make the next transaction fail on-chain; rejecting in the wallet prompt always produces the "rejected" failure. Nothing moves in the UI until confirmation.

1. **Connect a wallet.** `/app` → "Connect demo wallet" → wallet prompt "Sign in to TimeVault" (no fee) → *pending* ("Waiting for signature…") → *connected*: header shows the `connect-wallet` chip (`0x3c9E…71aD`, "Noor (you)"). *Failed*: rejecting shows "You declined the sign-in request. Nothing was shared." with a retry.
2. **Create a vault.** `/app/new` → pick a template (Contributor vesting, Monthly stipend, Bounty reward, Sponsor pledge) or start blank → recipient name and address (validated `0x` + 40 hex, not your own) → token and amount (checked against your wallet balance) → schedule: on a date / monthly steps (number of months) / gradually (duration and optional cliff) → revocable switch, optional reviewer approval (2 of 3) → the live preview draws the schedule and lists the first unlocks → *Lock 12,000 tUSDC* → wallet prompt → *pending* ("Locking your funds…") → *confirmed*: redirect to the new vault, "Vault created" toast, wallet balance reduced. *Failed*: "The deposit failed on the network. Your tokens never left your wallet." with *Try again*; form stays filled.
3. **Fast-forward and claim.** Dashboard → "Workshop honorarium" (for you, 600 tUSDC, unlocks in 3 days) → drag the time scrubber to preview the unlock date → *Fast-forward to this date* → the demo clock jumps, the padlock opens, 600 tUSDC becomes claimable → *Claim 600 tUSDC* → wallet prompt → *pending* → *confirmed*: claimable drains into "Claimed", receipt in Activity, balance up. *Before unlock*: the claim button is disabled with "Nothing to claim until {date}". *Failed*: "The claim failed. Your funds are still in the vault and still yours."
4. **Approve a conditional release.** "Bug bounty: wallet recovery fix" (1,500 tUSDC for Tomás, unlocks on a date, needs 2 of 3 reviewer approvals, Kwame has approved) → *Approve release* → wallet prompt → *pending* → *confirmed*: "2 of 3 approvals: release approved". Fast-forward past the date → *Simulate Tomás's claim* (the recipient claims from their own wallet, so no prompt for you) → *pending* → *confirmed*: completed. Until approved, the vault shows "Unlocked but waiting for approval" and nothing is claimable.
5. **Revoke and audit.** "Ambassador stipend, fall term" (Léa, 6 × 300 tDAI, revocable, 2 steps claimed) → *Revoke vault* → confirmation explaining "Léa keeps 600 tDAI already unlocked; 1,200 tDAI returns to you" → wallet prompt → *pending* → *revoked*: status "Revoked", chart cut at today, remaining tranches struck through. Then *Activity* tab → filter (all, locks, claims, approvals, revocations) → every row has time (locale format), actor, amount and transaction hash → *Export CSV*. Empty state on a new vault: "Nothing has happened since the funds were locked."

## 7. Content (EN / FR)

The shipped copy lives in `src/i18n/dictionaries/en.ts` and `fr.ts` (typed; French must satisfy the English shape). Draft copy for the main sections:

### Home

| Slot | English | Français |
|-|-|-|
| Eyebrow | Safe module · Monark | Module Safe · Monark |
| H1 | Lock it today. It unlocks when promised. | Verrouillé aujourd'hui, libéré au jour promis. |
| Sub | TimeVault holds contributor grants, stipends and bounty rewards in a smart contract that releases them on a schedule everyone can see. No reminders, no chasing, no taking anyone's word for it. | TimeVault garde les bourses de contributeurs, les allocations et les primes dans un contrat intelligent qui les libère selon un calendrier visible par tous. Pas de rappels, pas de relances, pas besoin de croire qui que ce soit sur parole. |
| CTAs | Launch the demo · See how it works | Lancer la démo · Voir le fonctionnement |
| Outcomes H2 | A promise with a clock in it | Une promesse, avec l'horloge incluse |
| Outcome 1 | **Know what's coming, and when.** The schedule is public and the next unlock counts down to the second. Nobody has to ask. | **Savoir ce qui arrive, et quand.** Le calendrier est public et le prochain déblocage s'affiche à la seconde près. Personne n'a à demander. |
| Outcome 2 | **Paid on time, without anyone remembering.** Monthly steps and gradual vesting unlock on their own; recipients claim when it suits them. | **Payé à temps, sans que personne n'y pense.** Les paliers mensuels et l'acquisition progressive se débloquent seuls ; chacun réclame quand ça lui convient. |
| Outcome 3 | **Fair both ways.** If someone steps down, only what hasn't unlocked returns. Bigger rewards wait for reviewers to agree. | **Équitable dans les deux sens.** Si quelqu'un se retire, seul ce qui n'est pas débloqué revient. Les grosses primes attendent l'accord des réviseurs. |
| Schedules H2 | Release money the way you agreed to | Versez l'argent comme vous l'avez convenu |
| On a date | **On a date.** Everything unlocks at once: a bounty after the fix ships, a pledge on the day of the event. | **À une date.** Tout se débloque d'un coup : une prime une fois le correctif livré, un engagement le jour de l'événement. |
| Monthly steps | **Monthly steps.** Equal amounts on the same day each month: stipends, part-time pay, ambassador rewards. | **Paliers mensuels.** Le même montant, le même jour, chaque mois : allocations, rémunération à temps partiel, récompenses d'ambassadeurs. |
| Gradually | **Gradually.** Unlocks a little every second after an optional cliff: the classic contributor vesting. | **En continu.** Un peu se débloque chaque seconde, après une période d'attente facultative : l'acquisition classique des contributeurs. |
| Who H2 | Built for people who keep their word | Pensé pour celles et ceux qui tiennent parole |
| Contributors | **Contributors.** Your grant vests while you build, and you can see every coming unlock without asking the treasurer. | **Contributeurs.** Votre bourse s'acquiert pendant que vous bâtissez, et vous voyez chaque déblocage à venir sans écrire au trésorier. |
| Student clubs | **Student clubs.** Pay ambassadors and organizers a monthly stipend for the term, set up once in September. | **Clubs étudiants.** Versez une allocation mensuelle aux ambassadeurs et aux organisateurs pour la session, réglée une seule fois en septembre. |
| Grants and sponsors | **Grants and sponsors.** Pledge funds to a community event and release them on the day, with reviewers signing off. | **Bourses et commandites.** Engagez des fonds pour un événement communautaire et libérez-les le jour venu, avec l'accord des réviseurs. |
| Closing | Lock your first vault in two minutes. / Launch the demo | Créez votre premier coffre en deux minutes. / Lancer la démo |

**FAQ**

1. *Is this real money?* No. This is a testnet demo with simulated data: no real funds, no real wallet, nothing leaves your browser. / *Est-ce de l'argent réel ?* Non. C'est une démo sur testnet avec des données simulées : aucun fonds réel, aucun vrai portefeuille, rien ne quitte votre navigateur.
2. *What is a vault, exactly?* A small smart contract (a program on the blockchain) that holds one amount for one recipient and follows one schedule. Nobody, not even the funder, can take the money out early, unless the vault is revocable. / *Qu'est-ce qu'un coffre, au juste ?* Un petit contrat intelligent (un programme sur la blockchain) qui garde un montant pour une personne et suit un calendrier. Personne, pas même celui qui l'a financé, ne peut retirer l'argent avant l'heure, sauf si le coffre est révocable.
3. *Why do recipients have to claim?* Claiming lets them choose when to withdraw (and pay the network fee), and it keeps the contract simple: it never has to send money on its own. / *Pourquoi faut-il réclamer ?* Réclamer permet de choisir quand retirer (et quand payer les frais de réseau), et garde le contrat simple : il n'a jamais à envoyer d'argent de lui-même.
4. *What happens when a vault is revoked?* Everything already unlocked stays with the recipient and can still be claimed. Only the part that is still locked returns to the funder. / *Que se passe-t-il quand un coffre est révoqué ?* Tout ce qui est déjà débloqué reste à la personne bénéficiaire et peut toujours être réclamé. Seule la part encore verrouillée revient au financeur.
5. *Can the schedule be changed after locking?* No. That's the point: the dates can't move. To change terms, the funder revokes a revocable vault and creates a new one, and both steps are in the log. / *Peut-on modifier le calendrier après coup ?* Non, et c'est tout l'intérêt : les dates ne bougent pas. Pour changer les conditions, le financeur révoque un coffre révocable et en crée un nouveau, et les deux étapes figurent au journal.
6. *How precise is the timing?* On a real network, unlocks follow block timestamps, accurate to a few seconds. In this demo you can fast-forward the clock to see months pass in a click. / *Quelle est la précision du minutage ?* Sur un vrai réseau, les déblocages suivent l'horodatage des blocs, précis à quelques secondes près. Dans cette démo, vous pouvez avancer l'horloge pour voir des mois passer en un clic.

### App: key strings

| Slot | English | Français |
|-|-|-|
| Connect gate | Connect a demo wallet to open your vaults. Nothing is signed for real. | Connectez un portefeuille de démo pour ouvrir vos coffres. Rien n'est signé pour de vrai. |
| Dashboard H1 | Your vaults | Vos coffres |
| Summary | Claimable for you · Locked for others · Next unlock · Released to date | À réclamer · Verrouillé pour d'autres · Prochain déblocage · Libéré à ce jour |
| Sections | For you · Funded by you · Upcoming unlocks · Recent activity | Pour vous · Financés par vous · Prochains déblocages · Activité récente |
| Demo clock | Demo clock · Fast-forward · +1 day · +1 week · +1 month · Next unlock | Horloge de démo · Avancer · +1 jour · +1 semaine · +1 mois · Prochain déblocage |
| Scrubber | Preview a date · On {date}: {unlocked} unlocked, {locked} still locked · Fast-forward to this date | Prévisualiser une date · Le {date} : {unlocked} débloqués, {locked} encore verrouillés · Avancer jusqu'à cette date |
| Status | Locked · Unlocking · Claimable · Waiting for approval · Completed · Revoked | Verrouillé · En déblocage · À réclamer · En attente d'approbation · Terminé · Révoqué |
| Claim | Claim {amount} · Nothing to claim until {date} | Réclamer {amount} · Rien à réclamer avant le {date} |
| Wallet prompt | Confirm in your wallet · Estimated network fee · Confirm · Reject | Confirmez dans votre portefeuille · Frais de réseau estimés · Confirmer · Refuser |
| Disclaimer | Testnet demo · not financial advice · no real funds | Démo sur testnet · ceci n'est pas un conseil financier · aucun fonds réel |
| Pending | Waiting for the network… | En attente du réseau… |
| Lock failed | The deposit failed on the network. Your tokens never left your wallet. | Le dépôt a échoué sur le réseau. Vos jetons n'ont jamais quitté votre portefeuille. |
| Claim failed | The claim failed. Your funds are still in the vault and still yours. | La réclamation a échoué. Vos fonds sont toujours dans le coffre, et toujours à vous. |
| Rejected | You rejected the request in your wallet. Nothing was sent. | Vous avez refusé la demande dans votre portefeuille. Rien n'a été envoyé. |
| Revoke confirm | {name} keeps {kept} already unlocked. {returned} still locked returns to you. | {name} garde les {kept} déjà débloqués. Les {returned} encore verrouillés vous reviennent. |
| Empty dashboard | You don't have any vaults yet. Create one, or reset the demo to bring back the examples. | Vous n'avez encore aucun coffre. Créez-en un, ou réinitialisez la démo pour retrouver les exemples. |
| Empty "for you" | Nobody has locked funds for you yet. | Personne n'a encore verrouillé de fonds pour vous. |
| Activity empty | Nothing has happened since the funds were locked. | Rien ne s'est passé depuis le verrouillage des fonds. |
| Unknown vault | We couldn't find this vault. It may have been removed when the demo was reset. | Ce coffre est introuvable. Il a peut-être disparu lors de la réinitialisation de la démo. |
| Storage error | Your browser blocked local storage, so the demo will forget changes when you leave. | Votre navigateur bloque le stockage local : la démo oubliera vos changements à la fermeture. |

The complete list (validation, demo controls, tabs, toasts, how-it-works and credits copy) is in the dictionaries.

## 8. Aesthetics (within the Monark guidelines)

Colour, type, logo, header and footer are fixed by the guidelines: cream / espresso tokens derived from `#f88d10` with `--surface-tint: 1` (the §3 token block pasted over `theme.json`), Nunito Sans 400/600/700/800, pill actions, 1rem cards, borders not shadows, flat orange only.

- **Layout and rhythm.** Home alternates wide statement bands with dense bands: hero (copy left, live vault right on desktop; stacked on mobile) → outcomes (three columns, icons top-left) → schedules (three cards, each with a real mini chart drawn by the same code as the app) → photo cards → FAQ (single column, 68ch) → closing band. The branded section divider appears twice. The app is a working tool: content + a right rail (upcoming unlocks, activity) on desktop, single column on mobile; the vault page leads with the figures and the chart, actions in a sticky side card on desktop.
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
- The FAQ uses native `<details>` (no JavaScript). Seeded example data is created in the visitor's language, with dates relative to the moment the demo is first opened (or reset), so countdowns are always live.
