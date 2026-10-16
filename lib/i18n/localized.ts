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
 *
 * `null`/`undefined` resolve to "" so a caller can treat "the admin never
 * filled this in" and "the value is blank" identically and fall back to a
 * default in one expression (`pick(row.field, lang).trim() || fallback`).
 * The parameter is widened rather than guarded at each call site because
 * optional overrides are now the common shape across these columns.
 */
export function pick(
  value: Localized | string | null | undefined,
  lang: Language,
): string {
  if (value === null || value === undefined) return "";
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

/**
 * Display name for a product category — dictionary-FIRST, with the row's own
 * `name` column as the fallback.
 *
 * ── Why the dictionary wins here, unlike a product ──────────────────────────
 *
 * A category's name has always been resolved through its `i18nKey` column, and
 * the two sources are NOT interchangeable: the seeded column holds "Lighting"
 * while the dictionary holds the styled "LIGHTING". Letting the column win would
 * silently re-case every category title on the site, so the dictionary stays
 * first and the column is only a fallback.
 *
 * ── Why the fallback is needed at all ───────────────────────────────────────
 *
 * `i18nKey` is no longer typed by the admin — the category action derives it
 * from the slug (lib/admin/actions/product-categories.ts#withI18nKey). A
 * brand-new category therefore gets a key that may not exist in the dictionary
 * yet, and `t()` returns the RAW KEY on a miss — which would render
 * "products.outdoor" as a page title. Falling back to `name` (the column the
 * admin did fill in) keeps that case readable without changing a single byte of
 * what the seeded rows render.
 */
export function displayCategoryName(
  t: (key: string) => string,
  category: { i18nKey: string; name: Localized },
  lang: Language,
): string {
  const translated = t(category.i18nKey);
  return translated !== category.i18nKey
    ? translated
    : pick(category.name, lang);
}
