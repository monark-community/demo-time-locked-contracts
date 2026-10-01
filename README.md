# TimeVault by Monark

TimeVault lets a community **lock a promised payment today and release it on a schedule a contract enforces**: a contributor grant that vests over a year, a monthly stipend for a term, a bounty that waits for two reviewers. Recipients can see exactly what's coming and when, and claim it when it unlocks; funders never run payroll by hand and keep a fair way out (revocation) if a deal ends early. It is Monark's vesting and delayed-release module, part of the Safe family.

This repository is the **interactive demo site**: a Next.js app with a fully simulated testnet and a demo clock you can fast-forward, so anyone can lock funds, watch months of unlocks in seconds, claim, approve and revoke without a wallet or real funds.

- Project documentation: https://www.monark.io/en/project/time-locked-contracts
- Site plan (product brief, flows, copy, design decisions): [`docs/site-plan.md`](docs/site-plan.md)
- Image credits: [`docs/assets.md`](docs/assets.md)

> Testnet demo · not financial advice · no real funds. All data is simulated and stays in your browser.

## What you can do in the demo

1. **Connect a demo wallet** (sign or reject the sign-in request).
2. **Create a vault** from a template or from scratch: recipient, token and amount (checked against your balance), a schedule (on a date, monthly steps, or gradually with a cliff), revocable or not, optional 2-of-3 reviewer approval. A live chart previews the schedule.
3. **Fast-forward and claim**: drag the time scrubber along a vault's schedule to preview any date (padlocks open as you pass them), fast-forward the demo clock, then claim what unlocked.
4. **Approve a conditional release**: add your approval to a bounty, then let the recipient claim once the date passes.
5. **Revoke and audit**: stop a stipend early (unlocked funds stay with the recipient, the rest comes back), then filter and export the activity log as CSV.

Every transaction goes through a simulated wallet prompt, a pending state with a transaction hash, then confirmed or failed. Use **Demo controls** to slow the network, force the next transaction to fail, or reset the demo (which also brings the clock back to today).

## Run it locally

Requirements: Node.js 22 and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000 (redirects to /en or /fr)
```

Checks:

```bash
pnpm lint
pnpm typecheck    # next typegen && tsc --noEmit
pnpm build && pnpm start
```

No environment variables are needed. `NEXT_PUBLIC_SITE_URL` optionally overrides the canonical URL used in metadata and the sitemap (default `https://timevault.monark.io`).

### Screenshots

With a production server running (`pnpm build && pnpm start -p 3142`), `pnpm screenshots` drives every page and key flow with Playwright at 390 and 1440 px, light and dark, in English (plus the home page and the claim flow in French), reports any horizontal overflow, and writes PNGs to `docs/screenshots/`. Set `BASE_URL` if the server isn't on port 3142, and `ONLY=en-390-light` to run one variant.

## How the simulation works

Everything lives in `src/lib/demo/`, behind a small typed layer shaped like the real contract, so it can be swapped for wagmi/viem without touching the UI:

| File | Role |
|-|-|
| `types.ts` | Vaults, schedules, parties, reviewers, activity entries. Amounts are integer base units stored as strings (bigint-safe). |
| `vesting.ts` | The contract's maths as pure functions of a vault and a timestamp: unlocked, claimable, still locked, status, tranches, next unlock, and the chart curve. Monthly remainders go to the last tranche, so totals are exact. |
| `ops.ts` | What each call changes when its transaction confirms: `lock`, `claim`, `approve`, `revoke`. |
| `chain.ts` | `useTx()`: wallet prompt → pending (1.2–2.4 s, 3–6 s on "slow network") → confirmed or reverted. |
| `store.ts` | External store persisted to `localStorage` (every access in try/catch; the demo still works if storage is blocked), the wallet-prompt channel, and the **demo clock**: real time plus a forward-only offset, standing in for the latest block timestamp. |
| `seed.ts` | Seven localized example vaults dated relative to the moment the demo opens, so countdowns are always live: two for you (a gradual tETH vesting, an honorarium unlocking in 3 days) and five you fund (a grant past its cliff, a bounty waiting for reviewers, a monthly stipend, a sponsor pledge, a completed series). |
| `tokens.ts` | Testnet tokens (`tUSDC`, `tDAI`, `tETH`) with the Monark demo reference prices. |

## Project structure

```
src/
  proxy.ts                  locale redirect (/ → /en or /fr from Accept-Language)
  app/
    [locale]/               root layout (html lang, header, footer), home, 404
      app/                  demo: dashboard, new, vault/[id]
      how-it-works/  credits/  pricing/ (internal, unlinked, noindex)
      opengraph-image.tsx
    sitemap.ts  robots.ts  icon.svg  globals.css (Monark 2026 tokens)
  components/
    ui/                     shadcn/ui + @monark/ui registry (wallet, connect-wallet, network-badge, tx-status…)
    site/                   Monark standard navbar (brand, links, demo chip, EN/FR, theme), footer
    charts/                 schedule chart (server- and client-renderable)
    home/                   hero live vault
    demo/                   dashboard, composer, vault page, time scrubber, demo clock, wallet prompt, tx feedback
  i18n/                     locale config, typed EN/FR dictionaries
  lib/demo/                 simulated chain and data layer
docs/                       site plan, assets, screenshots
scripts/screenshots.mjs     Playwright visual check
```

Built with Next.js (App Router, TypeScript strict), Tailwind CSS v4, shadcn/ui on the [Monark UI registry](https://ui.monark.io) and Lucide icons, following the Monark brand guidelines (cream and espresso themes, Nunito Sans, flat orange).

## Deploy to Vercel

Import the repository in Vercel and deploy with the defaults: framework Next.js, install `pnpm install`, build `pnpm build`. No `vercel.json` and no environment variables are required; the Node version comes from `engines` in `package.json`. Every page prerenders, including the seven example vaults; vaults created in the browser render on demand as a client shell.

## License and credits

Open source by the Monark community. Photos from Unsplash (free license), credited on `/credits` and in `docs/assets.md`.
