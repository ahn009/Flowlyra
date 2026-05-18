import { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import { DEFAULT_LOCALE, MESSAGES, SUPPORTED_LOCALES, type LocaleCode } from "./catalog";

const LOCALE_STORAGE_KEY = "flowlyra.dashboard.locale";

interface I18nContextValue {
  locale: LocaleCode;
  supportedLocales: readonly LocaleCode[];
  setLocale: (next: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): LocaleCode {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(LOCALE_STORAGE_KEY) : null;
  if (stored && SUPPORTED_LOCALES.includes(stored as LocaleCode)) return stored as LocaleCode;
  const browserLang = typeof navigator !== "undefined" ? navigator.language.slice(0, 2).toLowerCase() : DEFAULT_LOCALE;
  if (SUPPORTED_LOCALES.includes(browserLang as LocaleCode)) return browserLang as LocaleCode;
  return DEFAULT_LOCALE;
}

function formatTemplate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce((acc, [key, value]) => acc.split(`{${key}}`).join(String(value)), template);
}

export function I18nProvider({ children }: PropsWithChildren): JSX.Element {
  const [locale, setLocaleState] = useState<LocaleCode>(() => detectLocale());

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    supportedLocales: SUPPORTED_LOCALES,
    setLocale: (next: LocaleCode) => {
      setLocaleState(next);
      if (typeof window !== "undefined") window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    },
    t: (key: string, vars?: Record<string, string | number>) => {
      const table = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
      const raw = table[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
      return formatTemplate(raw, vars);
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
