"use client";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { HTML_LANG, LOCALE_COOKIE, localeFromCookie, t, type Key, type Locale } from "@/lib/i18n";

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
const read = () => localeFromCookie(document.cookie);
/** Server-resolved locale (from the cookie in layout.tsx); keeps SSR + hydration in the right language. */
const ServerLocale = createContext<Locale>("zh");

export const LocaleProvider = ({ locale, children }: { locale: Locale; children: ReactNode }) => (
  <ServerLocale.Provider value={locale}>{children}</ServerLocale.Provider>
);

export function setLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = HTML_LANG[l];
  listeners.forEach((f) => f());
}

export function useLocale(): Locale {
  const serverLocale = useContext(ServerLocale);
  return useSyncExternalStore(subscribe, read, () => serverLocale);
}

/** `const t = useT(); t("nav.chat")` — re-renders when the locale cookie changes. */
export function useT() {
  const locale = useLocale();
  return (key: Key, params?: Record<string, string | number>) => t(key, locale, params);
}
