"use client";

import {
  createContext,
  useCallback,
  useContext,
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

function getInitialLang(initialLang?: Language): Language {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("henge-lang");
      if (saved === "en" || saved === "fa") return saved;
    } catch {
      // ignore
    }
  }
  return initialLang ?? "en";
}

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLang?: Language;
}

export function LanguageProvider({
  children,
  initialLang,
}: LanguageProviderProps) {
  const [lang, setLangState] = useState<Language>(() =>
    getInitialLang(initialLang),
  );

  const dir = lang === "fa" ? "rtl" : "ltr";

  const writeLangCookie = (l: Language) => {
    try {
      document.cookie = `henge-lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
  };

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      localStorage.setItem("henge-lang", l);
      writeLangCookie(l);
    } catch {
      // ignore
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "en" ? "fa" : "en";
      try {
        localStorage.setItem("henge-lang", next);
        writeLangCookie(next);
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
