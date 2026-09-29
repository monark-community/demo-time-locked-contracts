"use client"

import { useTheme } from "next-themes"
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react"
import { Toaster } from "sonner"

import type { Dictionary } from "@/i18n"
import type { Locale } from "@/i18n/config"
import { initDemo } from "@/lib/demo/store"

import { WalletPrompt } from "./wallet-prompt"

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
  const { resolvedTheme } = useTheme()
  const wide = useWide()
  useEffect(() => {
    initDemo(value.seed, value.locale)
  }, [value.seed, value.locale])

  return (
    <AppContext.Provider value={value}>
      {children}
      <WalletPrompt />
      <Toaster
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        // Transactions and clock moves confirm inline, where they happened, so
        // no toast ever sits on the vault card or chart. The only toast left
        // is "Demo reset", shown after the controls dialog closes: bottom-right
        // on desktop, under the header on phones.
        position={wide ? "bottom-right" : "top-center"}
        offset={{ bottom: 24, right: 24 }}
        mobileOffset={{ top: 72, left: 16, right: 16 }}
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border !border-border !bg-popover !text-popover-foreground !font-sans !shadow-md",
            description: "!text-muted-foreground",
          },
        }}
      />
    </AppContext.Provider>
  )
}
