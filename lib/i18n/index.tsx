"use client"

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from "react"
import { translations, type Locale } from "./translations"

type TranslationKey = keyof typeof translations.en

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = "planigo-locale"
const DEFAULT_LOCALE: Locale = "fr"

// External store backed by localStorage. Returning DEFAULT_LOCALE from
// getServerSnapshot (and during the first client render) keeps SSR and hydration
// in sync; React then re-renders with the real value after mount without us
// calling setState inside an effect.
const localeListeners = new Set<() => void>()
function subscribeLocale(cb: () => void) {
  localeListeners.add(cb)
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) cb() }
  window.addEventListener("storage", onStorage)
  return () => {
    localeListeners.delete(cb)
    window.removeEventListener("storage", onStorage)
  }
}
function getLocaleSnapshot(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (saved === "en" || saved === "fr") return saved
  // No explicit choice yet: try the browser locale (e.g. "fr-FR", "en-US").
  // We only honor the language subtag and fall back to DEFAULT_LOCALE for anything else.
  const navLang = (typeof navigator !== "undefined" ? navigator.language : "")?.toLowerCase()
  if (navLang.startsWith("fr")) return "fr"
  if (navLang.startsWith("en")) return "en"
  return DEFAULT_LOCALE
}
function getLocaleServerSnapshot(): Locale {
  return DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleServerSnapshot)

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, newLocale)
    localeListeners.forEach((cb) => cb())
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = translations[locale] as Record<string, string>
      let value = dict[key] ?? translations.en[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v))
        }
      }
      return value
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider")
  return ctx
}

export type { Locale, TranslationKey }

