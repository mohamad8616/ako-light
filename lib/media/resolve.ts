/**
 * Pass 13.5C — turning a Media relationship into the URL the app renders.
 *
 * ONE FUNCTION, ONE RULE: a linked `Media` row wins; the legacy URL column is
 * the fallback. Every repository that reads an image goes through here, so the
 * precedence is decided in exactly one place.
 *
 * WHY BOTH SOURCES STILL EXIST. This pass could not migrate the data: the
 * `media` table was empty and all 319 stored image URLs are EXTERNAL
 * (picsum / dummyimage / henge07), which the plan forbids converting. So
 * `mediaId` is NULL on every pre-existing row and the legacy column is still the
 * real source for them. The relationship is populated as admins attach Media
 * items, and each row flips over on its own without a migration.
 *
 * That is also why the fallback is not "temporary scaffolding": a row whose
 * Media was later deleted (the FK is `SET NULL`) must keep rendering, and this
 * is what makes that true.
 */

/** The minimal shape a resolved relation needs — keeps this module pure. */
export interface MediaUrlRef {
  url: string;
}

/** A required image slot: falls back to the legacy column. */
export function resolveMediaUrl(
  media: MediaUrlRef | null | undefined,
  legacyUrl: string,
): string {
  return media?.url ?? legacyUrl;
}

/** An optional image slot: null when neither source has a value. */
export function resolveOptionalMediaUrl(
  media: MediaUrlRef | null | undefined,
  legacyUrl: string | null | undefined,
): string | null {
  return media?.url ?? legacyUrl ?? null;
}

/** The `select` every resolver above expects from a Media relation. */
export const MEDIA_URL_SELECT = { select: { url: true } } as const;
