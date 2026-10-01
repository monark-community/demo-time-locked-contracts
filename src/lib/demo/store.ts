"use client"

import { useSyncExternalStore } from "react"

import { createSeed, type SeedCopy } from "./seed"
import type { DemoSettings, DemoState, TxSummary, Vault, WalletState } from "./types"

/**
 * The demo's single source of truth: a tiny external store persisted to
 * localStorage (every access in try/catch). Swapping to a real chain means
 * replacing this module and chain.ts; the UI only uses the hooks and actions.
 */

const STORAGE_KEY = "timevault-demo-v1"

let state: DemoState | null = null
let storageOk = true
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function persist() {
  if (!state) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    storageOk = true
  } catch {
    storageOk = false
  }
}

function load(): DemoState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DemoState
    if (parsed?.version !== 1 || !Array.isArray(parsed.vaults) || !parsed.wallet?.balances) return null
    // A reload never resumes a half-finished connection.
    if (parsed.wallet.status === "connecting") parsed.wallet.status = "disconnected"
    parsed.settings.clockOffset = Math.max(0, Number(parsed.settings.clockOffset) || 0)
    return parsed
  } catch {
    storageOk = false
    return null
  }
}

/** Load saved state, or seed the examples in the visitor's language. Idempotent. */
export function initDemo(copy: SeedCopy, locale: "en" | "fr") {
  if (state) return
  state = load() ?? createSeed(copy, locale, Date.now())
  persist()
  emit()
}

export function resetDemo(copy: SeedCopy, locale: "en" | "fr") {
  const connected = state?.wallet.status === "connected"
  state = createSeed(copy, locale, Date.now())
  if (connected) state.wallet.status = "connected"
  persist()
  emit()
}

export function update(fn: (s: DemoState) => DemoState) {
  if (!state) return
  state = fn(state)
  persist()
  emit()
}

export function updateVault(id: string, fn: (v: Vault) => Vault) {
  update((s) => ({ ...s, vaults: s.vaults.map((x) => (x.id === id ? fn(x) : x)) }))
}

export function setWallet(patch: Partial<WalletState>) {
  update((s) => ({ ...s, wallet: { ...s.wallet, ...patch } }))
}

export function setSettings(patch: Partial<DemoSettings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
}

export function getDemo() {
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Current demo state, or null until it has loaded on the client. */
export function useDemo(): DemoState | null {
  return useSyncExternalStore(subscribe, () => state, () => null)
}

export function useStorageOk(): boolean {
  return useSyncExternalStore(subscribe, () => storageOk, () => true)
}

/* ---------------------------------------------------------------------------
 * Demo clock: real time plus a forward-only offset the visitor controls.
 * ------------------------------------------------------------------------ */

/** Demo time in ms. Real vaults would read the latest block timestamp instead. */
export function demoNow(): number {
  return Date.now() + (state?.settings.clockOffset ?? 0)
}

/** Move the demo clock forward by `ms` (never backwards). */
export function advanceClock(ms: number) {
  if (!state || ms <= 0) return
  setSettings({ clockOffset: state.settings.clockOffset + ms })
}

/** Move the demo clock to a moment in the future (ignored if it's in the past). */
export function advanceClockTo(at: number) {
  advanceClock(at - demoNow())
}

/*
 * A shared one-second ticker. The snapshot only changes when the ticker fires
 * or the store changes (e.g. the clock was moved), never during render.
 */
let clockValue = 0
const clockListeners = new Set<() => void>()
let clockTimer: number | null = null

function refreshClock() {
  clockValue = demoNow()
  for (const l of clockListeners) l()
}

function subscribeClock(listener: () => void) {
  clockListeners.add(listener)
  listeners.add(refreshClock)
  if (clockValue === 0) clockValue = demoNow()
  if (clockTimer === null) clockTimer = window.setInterval(refreshClock, 1000)
  return () => {
    clockListeners.delete(listener)
    if (clockListeners.size === 0) {
      listeners.delete(refreshClock)
      if (clockTimer !== null) window.clearInterval(clockTimer)
      clockTimer = null
    }
  }
}

/** Ticking demo time for components (once a second, and immediately when the clock moves). Null before hydration. */
export function useNow(): number | null {
  const demo = useDemo()
  const now = useSyncExternalStore(subscribeClock, () => clockValue, () => 0)
  return demo && now ? now : null
}

/* ---------------------------------------------------------------------------
 * Simulated wallet prompt: a promise resolved by the WalletPrompt dialog.
 * ------------------------------------------------------------------------ */

export interface PromptRequest {
  summary: TxSummary
  resolve: (approved: boolean) => void
}

let prompt: PromptRequest | null = null
const promptListeners = new Set<() => void>()

export function requestSignature(summary: TxSummary): Promise<boolean> {
  return new Promise((resolve) => {
    prompt?.resolve(false)
    prompt = {
      summary,
      resolve: (ok) => {
        prompt = null
        for (const l of promptListeners) l()
        resolve(ok)
      },
    }
    for (const l of promptListeners) l()
  })
}

export function usePrompt(): PromptRequest | null {
  return useSyncExternalStore(
    (l) => {
      promptListeners.add(l)
      return () => promptListeners.delete(l)
    },
    () => prompt,
    () => null
  )
}
