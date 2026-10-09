"use client"

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"

import { MonarkMark } from "@/components/ui/site-brand"
import { Toaster } from "@/components/ui/sonner"
import { WalletPrompt } from "@/components/ui/wallet-prompt"
import type { Dictionary } from "@/i18n"
import type { Locale } from "@/i18n/config"
import { estimateFee } from "@/lib/demo/chain"
import { initDemo, useDemo, usePrompt } from "@/lib/demo/store"
import { NETWORK_NAME } from "@/lib/demo/tokens"

export interface AppCopy {
  locale: Locale
  app: Dictionary["app"]
  seed: Dictionary["seed"]
  disclaimer: string
  demoBadge: string
}

const AppContext = createContext<AppCopy | null>(null)

export function useAppCopy(): AppCopy {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useAppCopy must be used inside <AppProvider>")
  return ctx
}

/** The translated TxFeedback labels, shared by every action that sends a transaction. */
export function useTxLabels() {
  const { tx } = useAppCopy().app
  return {
    signingLabel: tx.signing,
    pendingLabel: tx.pending,
    pendingStatusLabel: tx.pending,
    confirmedLabel: tx.confirmed,
    failedLabel: tx.failed,
    reasons: { rejected: tx.rejected, reverted: tx.reverted },
    retryLabel: tx.retry,
    dismissLabel: tx.dismiss,
  }
}

const WIDE = "(min-width: 1024px)"
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(WIDE).matches,
    () => true
  )
}

export function AppProvider({ value, children }: { value: AppCopy; children: ReactNode }) {
  const wide = useWide()
  useEffect(() => {
    initDemo(value.seed, value.locale)
  }, [value.seed, value.locale])

  return (
    <AppContext.Provider value={value}>
      {children}
      <DemoWalletPrompt />
      <Toaster
        // Transactions and clock moves confirm inline, where they happened, so
        // no toast ever sits on the vault card or chart. The only toast left
        // is "Demo reset", shown after the controls dialog closes: bottom-right
        // on desktop, under the header on phones.
        position={wide ? "bottom-right" : "top-center"}
        offset={{ bottom: 24, right: 24 }}
        mobileOffset={{ top: 72, left: 16, right: 16 }}
      />
    </AppContext.Provider>
  )
}

/** The simulated wallet's confirmation sheet, driven by the store. Closing it counts as a rejection. */
function DemoWalletPrompt() {
  const prompt = usePrompt()
  const demo = useDemo()
  const { app, disclaimer, locale } = useAppCopy()
  const p = app.prompt
  // A fresh fee estimate per request.
  const fee = useMemo(() => (prompt ? estimateFee() : ""), [prompt])
  const feeText = fee ? `${Number(fee).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", { maximumFractionDigits: 5 })} tETH` : ""
  const summary = prompt?.summary

  return (
    <WalletPrompt
      open={!!prompt}
      onReject={() => prompt?.resolve(false)}
      onConfirm={() => prompt?.resolve(true)}
      site={
        <>
          <MonarkMark />
          {p.site}
        </>
      }
      title={summary?.title ?? p.title}
      description={p.title}
      account={demo ? { name: demo.wallet.name, address: demo.wallet.address } : undefined}
      rows={summary?.rows ?? []}
      network={NETWORK_NAME}
      networkLabel={p.network}
      fee={summary?.noFee ? undefined : feeText}
      feeLabel={p.fee}
      disclaimer={summary?.movesValue ? disclaimer : p.simulated}
      warning={!!summary?.movesValue}
      confirmLabel={p.confirm}
      rejectLabel={p.reject}
      closeLabel={app.close}
    />
  )
}
