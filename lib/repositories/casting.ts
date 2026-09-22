/**
 * Repository-layer casts.
 *
 * Every `Localized` value and every ordered content array is stored in a single
 * Postgres `jsonb` column with the exact shape the static modules under
 * lib/data/* used (see prisma/schema.prisma and AGENTS.md). These helpers narrow
 * Prisma's `JsonValue` back to the app-level types on the way out of the
 * repositories, so downstream components keep seeing identical shapes.
 */
import { Prisma } from "@/generated/prisma/client";
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
 * Prisma's `InputJsonValue` only accepts object literals: branded interfaces
 * such as `Localized` never get an implicit index signature. Widen app-level
 * values through `unknown` once, here, so every repository write shares the
 * same safe route into required `Json` columns.
 */
export function asJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Same as {@link asJsonInput}, for OPTIONAL `Json?` columns
 * (`Product.moreInfo`, `Flagship.detail`). `undefined`/`null` become
 * `Prisma.DbNull` (real SQL NULL); any other value is widened like above.
 * The return type is the EXACT generated union — a bare `Prisma.DbNull` type
 * reference is a TS error, while `Prisma.DbNull` as a VALUE is accepted.
 */
export function asNullableJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value == null ? Prisma.DbNull : asJsonInput(value);
}

/**
 * Narrows a `jsonb` column to an already-modelled object shape that has no
 * single-value helper yet (e.g. `Collection.description`, `Flagship.detail`).
 */
export function asJson<T>(value: unknown): T {
  return value as T;
}
