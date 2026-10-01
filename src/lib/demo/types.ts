/**
 * Domain types for the TimeVault demo. Everything the UI knows about vaults,
 * wallets and transactions goes through these shapes, so the simulated layer
 * in this folder could be replaced by wagmi/viem calls without UI changes.
 *
 * Amounts are integer base units stored as decimal strings (JSON-safe bigint),
 * e.g. 1,500 tUSDC with 6 decimals = "1500000000". Times are ISO strings.
 */

export type TokenSymbol = "tUSDC" | "tDAI" | "tETH"

export interface Token {
  symbol: TokenSymbol
  decimals: number
  /** Reference price in USD shared by the Monark demos. */
  usd: number
}

/**
 * date:    everything unlocks at `end`.
 * monthly: `steps` equal tranches, one per month after `start` (the last one at `end`).
 * linear:  unlocks continuously from `start` to `end`, nothing before `cliff` (if set).
 */
export type ScheduleKind = "date" | "monthly" | "linear"

export interface Schedule {
  kind: ScheduleKind
  start: string
  end: string
  /** linear only: nothing unlocks before this date; then everything accrued since start unlocks at once. */
  cliff: string | null
  /** monthly: number of tranches. 1 for the other kinds. */
  steps: number
}

export interface Party {
  name: string
  address: string
  /** Short context, e.g. "Core contributor" or "Student club". */
  role?: string
}

export interface Reviewer {
  name: string
  address: string
  isYou?: boolean
}

/** Release condition: `required` of the reviewers must approve before anything can be claimed. */
export interface ApprovalPolicy {
  required: number
  reviewers: Reviewer[]
  /** Addresses of reviewers who approved. */
  approvals: string[]
}

export type AuditKind = "locked" | "claimed" | "approved" | "revoked"

export interface AuditEntry {
  id: string
  at: string
  kind: AuditKind
  /** Human label of who did it. */
  actor: string
  actorAddress: string
  amount?: string
  hash: string
}

export interface Vault {
  id: string
  name: string
  purpose: string
  token: TokenSymbol
  /** Base units locked at creation. */
  total: string
  funder: Party
  recipient: Party
  schedule: Schedule
  revocable: boolean
  approval: ApprovalPolicy | null
  /** Contract address of this vault. */
  address: string
  createdAt: string
  /** Base units the recipient has withdrawn. */
  claimed: string
  /** Set when the funder revoked: unlocking stops at this moment. */
  revokedAt: string | null
  /** Base units that went back to the funder on revocation. */
  returned: string
  log: AuditEntry[]
}

export type WalletStatus = "disconnected" | "connecting" | "connected"

export interface WalletState {
  status: WalletStatus
  address: string
  name: string
  lastError: "rejected" | null
  balances: Record<TokenSymbol, string>
}

export interface DemoSettings {
  slow: boolean
  failNext: boolean
  /** Milliseconds the demo clock is ahead of real time. Only ever grows (until reset). */
  clockOffset: number
}

export interface DemoState {
  version: 1
  seededLocale: "en" | "fr"
  wallet: WalletState
  vaults: Vault[]
  settings: DemoSettings
}

/** Lifecycle of one simulated transaction, as the UI sees it. */
export type TxPhase = "idle" | "signing" | "pending" | "confirmed" | "failed"
export type TxError = "rejected" | "reverted"

export interface TxState {
  phase: TxPhase
  hash?: string
  error?: TxError
}

export interface TxSummary {
  /** Short title, e.g. "Claim 600 tUSDC". */
  title: string
  /** Optional detail rows (label, value). */
  rows?: { label: string; value: string }[]
  /** Transactions that move value show the testnet disclaimer. */
  movesValue: boolean
  /** Off-chain signature (sign-in): no network fee row. */
  noFee?: boolean
}

/** Derived, per-moment view of a vault (see vesting.ts). */
export type VaultStatus = "locked" | "unlocking" | "claimable" | "awaiting" | "completed" | "revoked"

export interface Tranche {
  index: number
  at: string
  amount: string
  /** linear schedules: a checkpoint (cliff or month end), not a discrete release. */
  checkpoint?: boolean
}
