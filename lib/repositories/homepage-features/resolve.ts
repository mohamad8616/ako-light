import type { Localized } from "@/lib/i18n/localized";
import { asLocalizedList } from "../casting";

/**
 * Reference/override resolution, shared by every slot.
 *
 * A slot either *references* a catalog entity (`reference` mode — the displayed
 * copy/image is read off the linked row) or *overrides* it (`override` mode —
 * the slot's own columns win, and any column left NULL still falls back to the
 * linked row, so a partial override can never blank a banner out). The CTA
 * destination is ALWAYS the linked entity's canonical route: override mode
 * changes what is displayed, never where the button goes.
 *
 * Internal to this directory — not re-exported from `./index`.
 */

/** Canonical route of a flagship — the FlagshipOne CTA target. */
export function flagshipHref(slug: string): string {
  return `/flagship/${slug}`;
}

/** Canonical route of a project — the project banners' CTA target. */
export function projectHref(slug: string): string {
  return `/projects/${slug}`;
}

/**
 * A slot in `override` mode whose column is NULL falls back to the value read
 * off the linked entity. Override columns are individually nullable, so an
 * admin who only retitles a banner keeps the referenced image, and so on.
 */
export function resolveField<T>(
  isOverride: boolean,
  override: T | null | undefined,
  reference: T,
): T {
  return isOverride && override != null ? override : reference;
}

/**
 * Narrows a nullable `Localized[]` override column. Unlike
 * `asLocalizedList()` this keeps NULL distinct from `[]`: NULL means "not
 * overridden" (fall back to the linked entity), `[]` means "the admin cleared
 * the paragraphs" (render none).
 */
export function asOptionalLocalizedList(value: unknown): Localized[] | null {
  return value == null ? null : asLocalizedList(value);
}
