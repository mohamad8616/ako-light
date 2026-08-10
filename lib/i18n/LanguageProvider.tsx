"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  translations,
  type Language,
  type TranslationKey,
} from "./translations";

interface LanguageContextValue {
  lang: Language;
  dir: "ltr" | "rtl";
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey | string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLang(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("henge-lang");
    if (saved === "en" || saved === "fa") return saved;
  } catch {
    // ignore
  }
  return "en";
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const dir = lang === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem("henge-lang", l);
    } catch {
      // ignore
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "en" ? "fa" : "en";
      try {
        localStorage.setItem("henge-lang", next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

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