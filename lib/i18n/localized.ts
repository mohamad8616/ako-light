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

/**
 * Translation key for a product's display name, derived from its slug.
 * "pendant-light" -> "products.pendantLight" (matches translations.ts).
 */
export function productKey(slug: string): string {
  return "products." + slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** Resolve the localized description template with the product name filled in. */
export function productName(t: (key: string) => string, slug: string): string {
  return t(productKey(slug));
}

/** Resolve the localized product description (template + translated name). */
export function productDescription(
  t: (key: string) => string,
  slug: string,
): string {
  return t("product.description").replace("{name}", productName(t, slug));
}
