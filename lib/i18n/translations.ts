import { en, fa } from "./translations/index";

export type Language = "en" | "fa";

// Public translation API. Internal content lives in ./translations/*
// (one pure-data module per domain); this entry point preserves the
// original shape so existing imports keep working unchanged.
export const translations = {
  en,
  fa,
} as const;

export type TranslationKey = keyof typeof translations.en;

export const languageNames: Record<Language, string> = {
  en: "English",
  fa: "Persian",
};
