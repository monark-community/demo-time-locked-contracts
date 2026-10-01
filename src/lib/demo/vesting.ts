import type { Schedule, Tranche, Vault, VaultStatus } from "./types"

/**
 * The time-lock maths, as the contract would do it. Pure functions of a vault
 * and a moment (ms since epoch), so the UI can ask "what about next March?"
 * as easily as "what about now?". All amounts are bigint base units.
 */

const ms = (iso: string) => new Date(iso).getTime()

/** Calendar month arithmetic, keeping the time of day; clamps to the month's last day. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime())
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime())
  d.setDate(d.getDate() + days)
  return d
}

/** Base units unlocked by the schedule alone at time t (ignores revocation). */
export function scheduleUnlocked(schedule: Schedule, total: bigint, t: number): bigint {
  const start = ms(schedule.start)
  const end = ms(schedule.end)
  if (t < start) return 0n
  switch (schedule.kind) {
    case "date":
      return t >= end ? total : 0n
    case "monthly": {
      const n = Math.max(1, schedule.steps)
      let passed = 0
      for (let i = 1; i <= n; i++) {
        if (t >= addMonths(new Date(schedule.start), i).getTime()) passed = i
      }
      if (passed >= n) return total
      return (total / BigInt(n)) * BigInt(passed)
    }
    case "linear": {
      if (schedule.cliff && t < ms(schedule.cliff)) return 0n
      if (t >= end) return total
      const span = BigInt(Math.max(1, end - start))
      return (total * BigInt(t - start)) / span
    }
  }
}

/** Unlocked at time t, taking revocation into account (unlocking stops when revoked). */
export function unlockedAt(vault: Vault, t: number): bigint {
  const total = BigInt(vault.total)
  const capAt = vault.revokedAt ? Math.min(t, ms(vault.revokedAt)) : t
  return scheduleUnlocked(vault.schedule, total, capAt)
}

/** The final amount the recipient can ever get: the total, or what had unlocked when revoked. */
export function entitlement(vault: Vault): bigint {
  return BigInt(vault.total) - BigInt(vault.returned)
}

export function approvalMet(vault: Vault): boolean {
  return !vault.approval || vault.approval.approvals.length >= vault.approval.required
}

export function claimableAt(vault: Vault, t: number): bigint {
  if (!approvalMet(vault)) return 0n
  const c = unlockedAt(vault, t) - BigInt(vault.claimed)
  return c > 0n ? c : 0n
}

/** Still locked in the contract (not yet unlocked, and not returned). */
export function lockedAt(vault: Vault, t: number): bigint {
  const l = entitlement(vault) - unlockedAt(vault, t)
  return l > 0n ? l : 0n
}

export function statusAt(vault: Vault, t: number): VaultStatus {
  const unlocked = unlockedAt(vault, t)
  const claimed = BigInt(vault.claimed)
  // A revoked vault stays "revoked"; anything unlocked before revocation still shows as claimable in the figures.
  if (vault.revokedAt) return "revoked"
  if (claimed >= BigInt(vault.total)) return "completed"
  if (unlocked > 0n && !approvalMet(vault)) return "awaiting"
  if (unlocked > claimed) return "claimable"
  if (unlocked === 0n) return "locked"
  return "unlocking"
}

/**
 * Discrete release points. date: one. monthly: one per month. linear: the
 * cliff (if any) then month-end checkpoints, amounts being what unlocks in
 * each period, so the table and the "upcoming" rail read the same for all kinds.
 */
export function tranches(vault: Pick<Vault, "schedule" | "total">): Tranche[] {
  const { schedule } = vault
  const total = BigInt(vault.total)
  const start = new Date(schedule.start)
  if (schedule.kind === "date") return [{ index: 1, at: schedule.end, amount: total.toString() }]
  if (schedule.kind === "monthly") {
    const n = Math.max(1, schedule.steps)
    const per = total / BigInt(n)
    return Array.from({ length: n }, (_, i) => ({
      index: i + 1,
      at: addMonths(start, i + 1).toISOString(),
      amount: (i === n - 1 ? total - per * BigInt(n - 1) : per).toString(),
    }))
  }
  const end = ms(schedule.end)
  const points: number[] = []
  if (schedule.cliff) points.push(ms(schedule.cliff))
  for (let i = 1; ; i++) {
    const p = addMonths(start, i).getTime()
    if (p >= end) break
    if (!schedule.cliff || p > ms(schedule.cliff)) points.push(p)
  }
  points.push(end)
  let prev = 0n
  return points.map((p, i) => {
    const u = scheduleUnlocked(schedule, total, p)
    const amount = u - prev
    prev = u
    return { index: i + 1, at: new Date(p).toISOString(), amount: amount.toString(), checkpoint: true }
  })
}

/** Next discrete unlock after t, or null. Linear schedules past their cliff unlock continuously. */
export function nextUnlock(vault: Vault, t: number): { at: string; amount: string; continuous?: boolean } | null {
  if (vault.revokedAt) return null
  const { schedule } = vault
  if (t >= ms(schedule.end)) return null
  if (schedule.kind === "linear") {
    if (schedule.cliff && t < ms(schedule.cliff)) {
      return { at: schedule.cliff, amount: scheduleUnlocked(schedule, BigInt(vault.total), ms(schedule.cliff)).toString() }
    }
    return { at: schedule.end, amount: (BigInt(vault.total) - unlockedAt(vault, t)).toString(), continuous: true }
  }
  const next = tranches(vault).find((tr) => ms(tr.at) > t)
  return next ? { at: next.at, amount: next.amount } : null
}

/** Points for the schedule chart: [time, unlocked base units], ready to scale. */
export function curve(vault: Pick<Vault, "schedule" | "total">): [number, bigint][] {
  const { schedule } = vault
  const total = BigInt(vault.total)
  const start = ms(schedule.start)
  const end = ms(schedule.end)
  if (schedule.kind === "date") return [[start, 0n], [end, 0n], [end, total]]
  if (schedule.kind === "monthly") {
    const pts: [number, bigint][] = [[start, 0n]]
    let acc = 0n
    for (const tr of tranches(vault)) {
      const at = ms(tr.at)
      pts.push([at, acc])
      acc += BigInt(tr.amount)
      pts.push([at, acc])
    }
    return pts
  }
  if (schedule.cliff) {
    const c = ms(schedule.cliff)
    return [[start, 0n], [c, 0n], [c, scheduleUnlocked(schedule, total, c)], [end, total]]
  }
  return [[start, 0n], [end, total]]
}

/** Whether `address` is the vault's recipient / funder. */
export const isRecipient = (vault: Vault, address: string) => vault.recipient.address.toLowerCase() === address.toLowerCase()
export const isFunder = (vault: Vault, address: string) => vault.funder.address.toLowerCase() === address.toLowerCase()
