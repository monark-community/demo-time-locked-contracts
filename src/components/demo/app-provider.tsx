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
        // Desktop: bottom-right. The vault page keeps its figures, chart and
        // actions in the upper part of the screen (actions stick to the top of
        // the right rail), so the bottom-right corner is empty space there.
        // Phones: just under the sticky header, away from the action buttons
        // that sit mid-screen when a transaction is started.
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
