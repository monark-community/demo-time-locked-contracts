import { seededAddress, seededHash } from "./ids"
import { units } from "./tokens"
import { addDays, addMonths, scheduleUnlocked } from "./vesting"
import type { AuditEntry, DemoState, Party, Reviewer, Schedule, TokenSymbol, Vault } from "./types"

/** Localized strings the seed needs (vault names, purposes, roles). People's names are not translated. */
export interface SeedCopy {
  youName: string
  roles: {
    contributor: string
    reviewer: string
    ambassador: string
    club: string
    speaker: string
    treasury: string
    lead: string
  }
  vaults: Record<
    "grant" | "bounty" | "stipend" | "pledge" | "workshops" | "vesting" | "honorarium",
    { name: string; purpose: string }
  >
}

export const YOU_ADDRESS = "0x3c9E5b7A0f4D2e8C61a9B3f07D5e2C84a1F971aD"

/** Ids of the example vaults, prerendered at build time. */
export const SEED_VAULT_IDS = [
  "honorarium-you",
  "vesting-you",
  "bounty-tomas",
  "stipend-lea",
  "grant-aicha",
  "pledge-club",
  "workshops-mateo",
] as const

const iso = (d: Date) => d.toISOString()

/**
 * Example vaults, dated relative to the moment the demo is opened (or reset)
 * so countdowns are always live: some already unlocking, some about to.
 */
export function createSeed(copy: SeedCopy, locale: "en" | "fr", nowMs: number): DemoState {
  // Anchor on today at 09:00 local time, so dates read cleanly.
  const base = new Date(nowMs)
  base.setHours(9, 0, 0, 0)

  const you: Party = { name: copy.youName, address: YOU_ADDRESS, role: copy.roles.lead }
  const treasury: Party = { name: "Monark treasury", address: seededAddress("monark-treasury"), role: copy.roles.treasury }
  const club: Party = { name: "Campus Blockchain Club", address: seededAddress("campus-club"), role: copy.roles.club }
  const person = (name: string, role: string): Party => ({ name, address: seededAddress(name), role })

  const reviewers: Reviewer[] = [
    { name: copy.youName, address: YOU_ADDRESS, isYou: true },
    { name: "Kwame Mensah", address: seededAddress("Kwame Mensah") },
    { name: "Inès Morel", address: seededAddress("Inès Morel") },
  ]

  let n = 0
  const entry = (id: string, at: Date, kind: AuditEntry["kind"], actor: Party | Reviewer, amount?: string): AuditEntry => ({
    id: `${id}-log-${++n}`,
    at: iso(at),
    kind,
    actor: actor.name,
    actorAddress: actor.address,
    amount,
    hash: seededHash(`${id}-${n}`),
  })

  const vault = (
    id: string,
    v: {
      copyKey: keyof SeedCopy["vaults"]
      token: TokenSymbol
      total: number
      funder: Party
      recipient: Party
      schedule: Schedule
      revocable: boolean
      approval?: Vault["approval"]
      created: Date
    }
  ): Vault => {
    const total = units(v.total, v.token)
    return {
      id,
      name: copy.vaults[v.copyKey].name,
      purpose: copy.vaults[v.copyKey].purpose,
      token: v.token,
      total,
      funder: v.funder,
      recipient: v.recipient,
      schedule: v.schedule,
      revocable: v.revocable,
      approval: v.approval ?? null,
      address: seededAddress(`vault-${id}`),
      createdAt: iso(v.created),
      claimed: "0",
      revokedAt: null,
      returned: "0",
      log: [entry(id, v.created, "locked", v.funder, total)],
    }
  }

  const withClaims = (v: Vault, claims: Date[]): Vault => {
    let claimed = 0n
    const log = [...v.log]
    for (const at of claims) {
      const unlocked = scheduleUnlocked(v.schedule, BigInt(v.total), at.getTime())
      const amount = unlocked - claimed
      if (amount <= 0n) continue
      claimed += amount
      log.push(entry(v.id, at, "claimed", v.recipient, amount.toString()))
    }
    return { ...v, claimed: claimed.toString(), log }
  }

  // Funded by you ----------------------------------------------------------
  const grantStart = addMonths(base, -4)
  const grant = withClaims(
    vault("grant-aicha", {
      copyKey: "grant",
      token: "tUSDC",
      total: 12000,
      funder: you,
      recipient: person("Aïcha Benali", copy.roles.contributor),
      schedule: { kind: "linear", start: iso(grantStart), end: iso(addMonths(grantStart, 12)), cliff: iso(addMonths(grantStart, 3)), steps: 1 },
      revocable: true,
      created: grantStart,
    }),
    [addDays(addMonths(grantStart, 3), 4)]
  )

  const bountyStart = addDays(base, -9)
  const bountyEnd = addDays(base, 5)
  bountyEnd.setHours(17, 0, 0, 0)
  const bountyBase = vault("bounty-tomas", {
    copyKey: "bounty",
    token: "tUSDC",
    total: 1500,
    funder: you,
    recipient: person("Tomás Ruiz", copy.roles.contributor),
    schedule: { kind: "date", start: iso(bountyStart), end: iso(bountyEnd), cliff: null, steps: 1 },
    revocable: false,
    approval: { required: 2, reviewers, approvals: [reviewers[1]!.address] },
    created: bountyStart,
  })
  const bounty: Vault = { ...bountyBase, log: [...bountyBase.log, entry("bounty-tomas", addDays(base, -2), "approved", reviewers[1]!)] }

  const stipendStart = addDays(addMonths(base, -2), -3)
  const stipend = withClaims(
    vault("stipend-lea", {
      copyKey: "stipend",
      token: "tDAI",
      total: 1800,
      funder: you,
      recipient: person("Léa Fortin", copy.roles.ambassador),
      schedule: { kind: "monthly", start: iso(stipendStart), end: iso(addMonths(stipendStart, 6)), cliff: null, steps: 6 },
      revocable: true,
      created: stipendStart,
    }),
    [addDays(addMonths(stipendStart, 1), 1), addDays(addMonths(stipendStart, 2), 2)]
  )

  const pledgeStart = addDays(base, -12)
  const pledge = vault("pledge-club", {
    copyKey: "pledge",
    token: "tDAI",
    total: 5000,
    funder: you,
    recipient: club,
    schedule: { kind: "date", start: iso(pledgeStart), end: iso(addDays(base, 24)), cliff: null, steps: 1 },
    revocable: false,
    created: pledgeStart,
  })

  const workshopsStart = addMonths(base, -5)
  const workshops = withClaims(
    vault("workshops-mateo", {
      copyKey: "workshops",
      token: "tUSDC",
      total: 900,
      funder: you,
      recipient: person("Mateo Silva", copy.roles.speaker),
      schedule: { kind: "monthly", start: iso(workshopsStart), end: iso(addMonths(workshopsStart, 3)), cliff: null, steps: 3 },
      revocable: false,
      created: workshopsStart,
    }),
    [addDays(addMonths(workshopsStart, 1), 2), addDays(addMonths(workshopsStart, 2), 1), addDays(addMonths(workshopsStart, 3), 6)]
  )

  // For you ----------------------------------------------------------------
  const vestingStart = addMonths(base, -2)
  const vesting = withClaims(
    vault("vesting-you", {
      copyKey: "vesting",
      token: "tETH",
      total: 2.4,
      funder: treasury,
      recipient: you,
      schedule: { kind: "linear", start: iso(vestingStart), end: iso(addMonths(vestingStart, 6)), cliff: null, steps: 1 },
      revocable: true,
      created: vestingStart,
    }),
    [addDays(vestingStart, 23)]
  )

  const honorariumStart = addDays(base, -20)
  const honorariumEnd = addDays(base, 3)
  honorariumEnd.setHours(12, 0, 0, 0)
  const honorarium = vault("honorarium-you", {
    copyKey: "honorarium",
    token: "tUSDC",
    total: 600,
    funder: club,
    recipient: you,
    schedule: { kind: "date", start: iso(honorariumStart), end: iso(honorariumEnd), cliff: null, steps: 1 },
    revocable: false,
    created: honorariumStart,
  })

  return {
    version: 1,
    seededLocale: locale,
    wallet: {
      status: "disconnected",
      address: YOU_ADDRESS,
      name: copy.youName,
      lastError: null,
      balances: { tUSDC: units(8450, "tUSDC"), tDAI: units(3200, "tDAI"), tETH: units(1.85, "tETH") },
    },
    vaults: [honorarium, vesting, bounty, stipend, grant, pledge, workshops],
    settings: { slow: false, failNext: false, clockOffset: 0 },
  }
}
