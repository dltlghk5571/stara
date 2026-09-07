"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Locale, TFunction } from "./types";
import { getDictionary, translate } from "./getDictionary";
import { writeLocaleCookie } from "./cookie";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    writeLocaleCookie(next);
    // Full reload: server components, <html lang>, and API-call defaults all
    // pick up the new cookie with zero extra wiring. The toggle only exists on
    // pre-app screens, so a reload here is unintrusive.
    if (typeof window !== "undefined") window.location.reload();
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      setLocale,
      t: (key, vars) => translate(dict, key, vars),
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale/useT must be used within <LocaleProvider>");
  return ctx;
}

export function useLocale() {
  const { locale, setLocale } = useLocaleContext();
  return { locale, setLocale };
}

export function useT(): TFunction {
  return useLocaleContext().t;
}
