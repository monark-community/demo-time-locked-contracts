"use client"

import { randomAddress, randomId } from "./ids"
import { demoNow, getDemo, update, updateVault } from "./store"
import type { ApprovalPolicy, AuditEntry, Party, Schedule, TokenSymbol, Vault } from "./types"
import { claimableAt, isRecipient, unlockedAt } from "./vesting"

/**
 * State changes applied when a simulated transaction confirms. Each mirrors
 * one contract call: lock (deploy + deposit), claim, approve, revoke.
 */

function logEntry(kind: AuditEntry["kind"], actor: Pick<Party, "name" | "address">, hash: string, amount?: string): AuditEntry {
  return {
    id: randomId("log"),
    at: new Date(demoNow()).toISOString(),
    kind,
    actor: actor.name,
    actorAddress: actor.address,
    amount,
    hash,
  }
}

function addBalance(token: TokenSymbol, delta: bigint) {
  update((s) => ({
    ...s,
    wallet: { ...s.wallet, balances: { ...s.wallet.balances, [token]: (BigInt(s.wallet.balances[token]) + delta).toString() } },
  }))
}

export interface NewVault {
  name: string
  purpose: string
  token: TokenSymbol
  total: string
  recipient: Party
  schedule: Schedule
  revocable: boolean
  approval: ApprovalPolicy | null
}

let justCreated: string | null = null
/** Id of the vault created in this page session, so its page can confirm it inline. */
export const lastCreatedId = () => justCreated

/** lock(): deploys the vault and deposits the funds from your wallet. Returns the new vault id. */
export function lockVault(input: NewVault, hash: string): string {
  const demo = getDemo()
  if (!demo) return ""
  const id = randomId("vault")
  const you: Party = { name: demo.wallet.name, address: demo.wallet.address }
  const vault: Vault = {
    id,
    ...input,
    funder: you,
    address: randomAddress(),
    createdAt: new Date(demoNow()).toISOString(),
    claimed: "0",
    revokedAt: null,
    returned: "0",
    log: [logEntry("locked", you, hash, input.total)],
  }
  update((s) => ({ ...s, vaults: [vault, ...s.vaults] }))
  addBalance(input.token, -BigInt(input.total))
  justCreated = id
  return id
}

/** claim(): withdraws everything claimable now to the recipient. Returns the amount claimed. */
export function claimVault(id: string, hash: string): bigint {
  const demo = getDemo()
  const vault = demo?.vaults.find((v) => v.id === id)
  if (!demo || !vault) return 0n
  const amount = claimableAt(vault, demoNow())
  if (amount <= 0n) return 0n
  updateVault(id, (v) => ({
    ...v,
    claimed: (BigInt(v.claimed) + amount).toString(),
    log: [...v.log, logEntry("claimed", v.recipient, hash, amount.toString())],
  }))
  if (isRecipient(vault, demo.wallet.address)) addBalance(vault.token, amount)
  return amount
}

/** approve(): one reviewer's approval of the release. */
export function approveVault(id: string, reviewerAddress: string, hash: string) {
  updateVault(id, (v) => {
    if (!v.approval) return v
    const reviewer = v.approval.reviewers.find((r) => r.address === reviewerAddress)
    if (!reviewer || v.approval.approvals.includes(reviewerAddress)) return v
    return {
      ...v,
      approval: { ...v.approval, approvals: [...v.approval.approvals, reviewerAddress] },
      log: [...v.log, logEntry("approved", reviewer, hash)],
    }
  })
}

/** revoke(): stops unlocking now. What has unlocked stays claimable; the rest returns to the funder. */
export function revokeVault(id: string, hash: string): bigint {
  const demo = getDemo()
  const vault = demo?.vaults.find((v) => v.id === id)
  if (!demo || !vault || vault.revokedAt || !vault.revocable) return 0n
  const now = demoNow()
  const returned = BigInt(vault.total) - unlockedAt(vault, now)
  updateVault(id, (v) => ({
    ...v,
    revokedAt: new Date(now).toISOString(),
    returned: returned.toString(),
    log: [...v.log, logEntry("revoked", v.funder, hash, returned.toString())],
  }))
  if (vault.funder.address.toLowerCase() === demo.wallet.address.toLowerCase()) addBalance(vault.token, returned)
  return returned
}
