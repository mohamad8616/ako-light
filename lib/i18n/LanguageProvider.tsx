"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLocalizedPath, type Locale } from "./routing";
// TYPE-ONLY. `TranslationKey` is erased at compile time, so importing it does
// not pull `./translations` — and with it both locales — back into the client
// graph. Changing this to a value import silently undoes the whole point of
// the `dictionary` prop below.
import type { TranslationKey } from "./translations";

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
   * The ACTIVE locale's dictionary, selected on the SERVER and passed down.
   *
   * WHY THIS IS A PROP AND NOT AN IMPORT
   *
   * This module is `"use client"`. It used to import the whole `translations`
   * object and index it at runtime (`translations[lang]`). A dynamic index into
   * a static object cannot be tree-shaken, so the bundler kept BOTH locales in
   * the client chunk and every visitor downloaded the unused dictionary —
   * measured at 18,825 gz for the public pair, present in one chunk.
   *
   * The locale is already known server-side (`params.locale`), so the server
   * picks the dictionary and hands down one locale. That takes the dictionary
   * out of the client JS graph entirely; it travels in the RSC payload. A
   * shared layout is NOT re-fetched on client navigation (only the page segment
   * changes — see the Next docs on partial rendering), so this is paid once per
   * locale, not once per page.
   *
   * Pass a module-level object (as the layouts do). `t` is memoised on its
   * identity, so a fresh object per render would rebuild it every time.
   */
  dictionary: Record<string, string>;
}

export function LanguageProvider({
  children,
  locale,
  dictionary,
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

  // No merge step any more: the server hands down exactly the dictionary this
  // subtree needs (see the `dictionary` prop doc above), so there is nothing to
  // combine here and no per-render allocation.
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
