import { type Language, translations } from "./translations";

export function getLanguageFromCookie(cookieHeader?: string): Language {
  if (!cookieHeader) return "en";
  const match = cookieHeader.match(/(?:^|;\s*)henge-lang=(fa|en)/);
  return match && match[1] === "fa" ? "fa" : "en";
}

export function getTranslations(lang: Language) {
  return translations[lang];
}
