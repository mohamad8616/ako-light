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

/**
 * DB-first product display name.
 *
 * The admin panel is the source of truth: a product's `name` column wins when
 * it carries text for the active language. The dictionary key derived from the
 * slug (`products.<slug>`) is only a fallback for rows that were never filled
 * in — without this precedence the public pages kept showing the seeded
 * template even after the admin renamed a product.
 */
export function displayProductName(
  t: (key: string) => string,
  product: { name: Localized; slug: string },
  lang: Language,
): string {
  return pick(product.name, lang).trim() || productName(t, product.slug);
}

/**
 * DB-first product description, same precedence rule as
 * {@link displayProductName}: `description` column first, dictionary template
 * (`product.description` with `{name}` substituted) as the fallback.
 */
export function displayProductDescription(
  t: (key: string) => string,
  product: { name: Localized; slug: string; description: Localized },
  lang: Language,
): string {
  return (
    pick(product.description, lang).trim() ||
    productDescription(t, product.slug)
  );
}
