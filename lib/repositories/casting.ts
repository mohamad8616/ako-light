/**
 * Repository-layer casts.
 *
 * Every `Localized` value and every ordered content array is stored in a single
 * Postgres `jsonb` column with the exact shape the static modules under
 * lib/data/* used (see prisma/schema.prisma and AGENTS.md). These helpers narrow
 * Prisma's `JsonValue` back to the app-level types on the way out of the
 * repositories, so downstream components keep seeing identical shapes.
 */
import type {
  DownloadLink,
  RelatedProduct,
} from "@/lib/data/product-categories/types";
import type { Localized } from "@/lib/i18n/localized";

/** Narrows a `jsonb` column holding `{ en, fa }`. */
export function asLocalized(value: unknown): Localized {
  return value as Localized;
}

/** Narrows a nullable `jsonb` column (e.g. `Product.moreInfo`, `Flagship.detail`). */
export function asOptionalLocalized(value: unknown): Localized | undefined {
  return value == null ? undefined : (value as Localized);
}

/** Narrows a `jsonb` column holding `Localized[]` (e.g. `Designer.bio`). */
export function asLocalizedList(value: unknown): Localized[] {
  return (value ?? []) as Localized[];
}

/** Narrows a `jsonb` column holding `(Localized | string)[]` (`Project.credits`). */
export function asMixedLocalizedList(value: unknown): (Localized | string)[] {
  return (value ?? []) as (Localized | string)[];
}

/** Narrows a `jsonb` column holding `DownloadLink[]`. */
export function asDownloadLinks(value: unknown): DownloadLink[] {
  return (value ?? []) as DownloadLink[];
}

/** Narrows a `jsonb` column holding `RelatedProduct[]`. */
export function asRelatedProducts(value: unknown): RelatedProduct[] {
  return (value ?? []) as RelatedProduct[];
}

/**
 * Narrows a `jsonb` column to an already-modelled object shape that has no
 * single-value helper yet (e.g. `Collection.description`, `Flagship.detail`).
 */
export function asJson<T>(value: unknown): T {
  return value as T;
}
