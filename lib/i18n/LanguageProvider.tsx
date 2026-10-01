"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  translations,
  type TranslationKey,
} from "./translations";
import { getLocalizedPath, type Locale } from "./routing";

interface LanguageContextValue {
  lang: Locale;
  dir: "ltr" | "rtl";
  setLang: (lang: Locale) => void;
  toggleLang: () => void;
  t: (key: TranslationKey | string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: React.ReactNode;
  /**
   * The active locale, passed down from the [locale] root layout.
   * The URL is the source of truth — the provider never guesses the
   * language from localStorage or cookies.
   */
  locale: Locale;
  /**
   * Extra strings merged ON TOP of the public dictionary for this subtree.
   *
   * Admin routes pass the admin dictionary here (`AdminLanguageProvider`), so
   * the ~43 KB of admin-only strings stay out of the public barrel that every
   * visitor downloads — see `@/lib/i18n/admin-translations`.
   *
   * Pass a module-level object: `useMemo` keys on its identity, so a fresh
   * object per render would rebuild the merged dictionary every time.
   */
  extra?: Record<string, string>;
}

export function LanguageProvider({
  children,
  locale,
  extra,
}: LanguageProviderProps) {
  // The URL is the source of truth: `lang` derives directly from the
  // route locale prop. No internal state — when a navigation changes the
  // route locale, the [locale] layout re-renders with the new locale and
  // every consumer follows.
  const lang = locale;

  const dir: "ltr" | "rtl" = lang === "fa" ? "rtl" : "ltr";

  // Keep the document in sync at runtime. The server already renders the
  // correct lang/dir from the route; this covers client-side navigations.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  }, [lang]);

  const router = useRouter();
  const pathname = usePathname();

  /**
   * Switching language = navigating to the same path in the other locale,
   * e.g. /about ↔ /en/about, /en/products/foo ↔ /products/foo.
   * The preference is stored (cookie + localStorage) but the URL always
   * wins on the next visit.
   */
  const setLang = useCallback(
    (l: Locale) => {
      if (l === lang) return;
      try {
        localStorage.setItem("henge-lang", l);
        document.cookie = `henge-lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // ignore
      }
      router.push(getLocalizedPath(pathname, l));
    },
    [lang, pathname, router],
  );

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "fa" : "en");
  }, [setLang, lang]);

  // Merged once per (locale, extra) rather than per `t()` call — `t` runs for
  // every translated string of every render.
  const dictionary = useMemo(
    () =>
      extra
        ? ({ ...translations[lang], ...extra } as Record<string, string>)
        : (translations[lang] as Record<string, string>),
    [lang, extra],
  );

  const t = useCallback(
    (key: TranslationKey | string) => dictionary[key] ?? key,
    [dictionary],
  );

  // Memoised so consumers do not all re-render whenever this provider's parent
  // does — it sits above the whole page tree, including the route transition.
  const value = useMemo(
    () => ({ lang, dir, setLang, toggleLang, t }),
    [lang, dir, setLang, toggleLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
