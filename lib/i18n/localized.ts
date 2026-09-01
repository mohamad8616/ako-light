import type { Language } from "./translations";

/** A string that exists in every supported language. */
export interface Localized {
  en: string;
  fa: string;
}

/**
 * Resolve a Localized value (or plain string) for a language.
 * Plain strings pass through unchanged, so data can migrate to
 * Localized field-by-field without breaking consumers.
 */
export function pick(value: Localized | string, lang: Language): string {
  if (typeof value === "string") return value;
  return value[lang] ?? value.en;
}

/** Helper for data files: build a Localized pair. */
export function loc(en: string, fa: string): Localized {
  return { en, fa };
}
