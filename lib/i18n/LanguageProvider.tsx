"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
}

export function LanguageProvider({ children, locale }: LanguageProviderProps) {
  // The URL is the source of truth: `lang` derives directly from the
  // route locale prop. No internal state — when a navigation changes the
  // route locale, the [locale] layout re-renders with the new locale and
  // every consumer follows.
  const lang = locale;

  const dir = lang === "fa" ? "rtl" : "ltr";

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

  const t = useCallback(
    (key: TranslationKey | string) => {
      const dict = translations[lang] as Record<string, string>;
      return dict[key] ?? key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, toggleLang, t }}>
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
