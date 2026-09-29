"use client"

import { CheckIcon, CircleDashedIcon, LockIcon, LockOpenIcon, UndoDotIcon, UserCheckIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"
import { useTx } from "@/lib/demo/chain"
import { approveVault, claimVault, revokeVault } from "@/lib/demo/ops"
import { getDemo } from "@/lib/demo/store"
import type { Vault } from "@/lib/demo/types"
import { approvalMet, claimableAt, entitlement, isFunder, isRecipient, nextUnlock, unlockedAt } from "@/lib/demo/vesting"
import { formatDateLong, formatToken } from "@/lib/format"

import { useAppCopy } from "./app-provider"
import { Disclaimer } from "./disclaimer"
import { TxFeedback } from "./tx-feedback"

/** Everything you can do with a vault, depending on who you are in it. */
export function VaultActions({ vault, now, me }: { vault: Vault; now: number; me: string }) {
  const { app, disclaimer } = useAppCopy()
  const a = app.vault.actions
  const youReceive = isRecipient(vault, me)
  const youFund = isFunder(vault, me)
  const youReview = vault.approval?.reviewers.some((r) => r.isYou || r.address.toLowerCase() === me.toLowerCase()) ?? false

  return (
    <section aria-labelledby="actions-title" className="flex flex-col gap-5 rounded-3xl border bg-card p-4 sm:p-6">
      <h2 id="actions-title" className="text-lg font-bold">
        {a.title}
      </h2>
      <ClaimBlock vault={vault} now={now} youReceive={youReceive} />
      {vault.approval ? <ApprovalBlock vault={vault} youReview={youReview} me={me} /> : null}
      {youFund ? <RevokeBlock vault={vault} now={now} /> : <p className="text-xs text-muted-foreground">{t(a.fundedByOther, { name: vault.funder.name })}</p>}
      <Disclaimer text={disclaimer} />
    </section>
  )
}

function ClaimBlock({ vault, now, youReceive }: { vault: Vault; now: number; youReceive: boolean }) {
  const { app, locale } = useAppCopy()
  const a = app.vault.actions
  const tx = useTx()
  const claimable = claimableAt(vault, now)
  const unlocked = unlockedAt(vault, now)
  const next = nextUnlock(vault, now)
  const done = BigInt(vault.claimed) >= entitlement(vault)
  const waitingApprovals = vault.approval && !approvalMet(vault) ? vault.approval.required - vault.approval.approvals.length : 0
  const amountText = formatToken(claimable, vault.token, locale)
  // Confirmations are shown inline, right where the action happened (no toast over the card).
  const [result, setResult] = useState<string | null>(null)

  const run = () =>
    tx.run(
      {
        title: t(app.summaries.claim, { amount: amountText }),
        rows: [
          { label: app.summaries.rowVault, value: vault.name },
          { label: app.summaries.rowTo, value: vault.recipient.name },
        ],
        movesValue: true,
      },
      (hash) => {
        const got = claimVault(vault.id, hash)
        setResult(t(a.claimed, { amount: formatToken(got, vault.token, locale) }))
      },
      { skipPrompt: !youReceive }
    )

  let reason: string | null = null
  if (claimable === 0n) {
    if (done) reason = a.claimDone
    else if (waitingApprovals > 0 && unlocked > BigInt(vault.claimed)) reason = t(a.claimAwaiting, { n: waitingApprovals })
    else if (next && !next.continuous) reason = t(a.claimNone, { date: formatDateLong(next.at, locale) })
    else if (next?.continuous) reason = a.claimNoneContinuous
    else reason = a.claimDone
  }

  return (
    <div className="flex flex-col gap-3">
      {youReceive ? (
        claimable > 0n ? (
          <Button size="lg" className="w-full" disabled={tx.busy} onClick={() => void run()}>
            <LockOpenIcon aria-hidden="true" />
            {t(a.claim, { amount: amountText })}
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="h-auto min-h-12 w-full py-2 whitespace-normal" disabled>
            <LockIcon aria-hidden="true" />
            {reason}
          </Button>
        )
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t(a.claimOnlyRecipient, { name: vault.recipient.name })}</p>
          {claimable > 0n ? (
            <div className="flex flex-col gap-1.5">
              <Button variant="outline" className="w-full" disabled={tx.busy} onClick={() => void run()}>
                <UserCheckIcon aria-hidden="true" />
                {t(a.simulateClaim, { name: vault.recipient.name.split(" ")[0] ?? vault.recipient.name })}
              </Button>
              <p className="text-xs text-muted-foreground">{a.simulateHint}</p>
            </div>
          ) : null}
        </>
      )}
      {reason && !youReceive ? <p className="text-sm text-muted-foreground">{reason}</p> : null}
      <TxFeedback state={tx.state} pendingLabel={a.claiming} confirmedLabel={result ?? undefined} revertedLabel={a.claimFailed} onRetry={() => void run()} onDismiss={tx.reset} />
    </div>
  )
}

function ApprovalBlock({ vault, youReview, me }: { vault: Vault; youReview: boolean; me: string }) {
  const { app, locale } = useAppCopy()
  const a = app.vault.actions
  const tx = useTx()
  const policy = vault.approval!
  const met = approvalMet(vault)
  const n = policy.approvals.length
  const m = policy.reviewers.length
  const amountText = formatToken(vault.total, vault.token, locale)
  const [result, setResult] = useState<string | null>(null)

  const approve = (reviewerAddress: string, simulated: boolean) =>
    tx.run(
      {
        title: t(app.summaries.approve, { amount: amountText }),
        rows: [
          { label: app.summaries.rowVault, value: vault.name },
          { label: app.summaries.rowRecipient, value: vault.recipient.name },
        ],
        movesValue: false,
      },
      (hash) => {
        approveVault(vault.id, reviewerAddress, hash)
        const after = getDemo()?.vaults.find((v) => v.id === vault.id)?.approval?.approvals.length ?? n + 1
        setResult(after >= policy.required ? a.approvalsMet : t(a.approved, { n: after, m }))
      },
      { skipPrompt: simulated }
    )

  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{a.approvalsTitle}</h3>
        <span className={met ? "text-sm font-bold text-success" : "text-sm font-bold text-warning"}>
          {met ? a.approvalsMet : t(a.approvalsProgress, { n, m })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t(a.approvalsNeeded, { required: policy.required, total: m })}</p>
      <ul className="flex flex-col gap-2">
        {policy.reviewers.map((r) => {
          const ok = policy.approvals.includes(r.address)
          const isYou = r.isYou || r.address.toLowerCase() === me.toLowerCase()
          return (
            <li key={r.address} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                {ok ? <CheckIcon className="size-4 text-success" aria-hidden="true" /> : <CircleDashedIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                <span className="font-semibold">
                  {r.name}
                  {isYou ? ` (${app.vault.you})` : ""}
                </span>
              </span>
              {ok ? (
                <span className="text-xs font-semibold text-success">{isYou ? a.approvedYou : a.approvedOther}</span>
              ) : met ? (
                <span className="text-xs text-muted-foreground">{a.pendingReviewer}</span>
              ) : isYou && youReview ? (
                <Button size="sm" disabled={tx.busy} onClick={() => void approve(r.address, false)}>
                  {a.approve}
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={tx.busy} onClick={() => void approve(r.address, true)}>
                  {t(a.approveAs, { name: r.name.split(" ")[0] ?? r.name })}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <TxFeedback state={tx.state} pendingLabel={a.approving} confirmedLabel={result ?? undefined} onDismiss={tx.reset} />
    </div>
  )
}

function RevokeBlock({ vault, now }: { vault: Vault; now: number }) {
  const { app, locale } = useAppCopy()
  const a = app.vault.actions
  const tx = useTx()
  const [confirming, setConfirming] = useState(false)

  if (vault.revokedAt) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <UndoDotIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t(a.revokedNote, {
          date: formatDateLong(vault.revokedAt, locale),
          returned: formatToken(vault.returned, vault.token, locale),
          funder: vault.funder.name,
        })}
      </p>
    )
  }
  if (!vault.revocable) return <p className="text-xs text-muted-foreground">{a.notRevocable}</p>
  if (BigInt(vault.claimed) >= BigInt(vault.total)) return null

  const unlocked = unlockedAt(vault, now)
  const returned = BigInt(vault.total) - unlocked
  const kept = formatToken(unlocked, vault.token, locale)
  const back = formatToken(returned, vault.token, locale)

  const run = () =>
    tx.run(
      {
        title: t(app.summaries.revoke, { name: vault.name }),
        rows: [
          { label: app.summaries.rowKept, value: kept },
          { label: app.summaries.rowReturned, value: back },
        ],
        movesValue: true,
      },
      (hash) => {
        // Once revoked, this block is replaced by the "Revoked on…" note, which is the confirmation.
        revokeVault(vault.id, hash)
        setConfirming(false)
      }
    )

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      {!confirming ? (
        <div className="flex flex-col gap-2">
          <Button variant="destructive" className="w-full" disabled={tx.busy} onClick={() => setConfirming(true)}>
            <UndoDotIcon aria-hidden="true" />
            {a.revoke}
          </Button>
          <p className="text-xs text-muted-foreground">{a.revokeHint}</p>
        </div>
      ) : (
        <div role="alertdialog" aria-labelledby="revoke-q" aria-describedby="revoke-body" className="flex flex-col gap-3 rounded-2xl border border-destructive/40 p-4">
          <p id="revoke-q" className="font-bold">
            {a.revokeTitle}
          </p>
          <p id="revoke-body" className="text-sm text-muted-foreground">
            {t(a.revokeBody, { name: vault.recipient.name, kept, returned: back })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" autoFocus disabled={tx.busy} onClick={() => void run()}>
              {t(a.revokeConfirm, { amount: back })}
            </Button>
            <Button variant="ghost" size="sm" disabled={tx.busy} onClick={() => setConfirming(false)}>
              {a.revokeCancel}
            </Button>
          </div>
        </div>
      )}
      <TxFeedback state={tx.state} pendingLabel={a.revoking} onRetry={() => void run()} onDismiss={tx.reset} />
    </div>
  )
}
