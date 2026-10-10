import type { Localized } from "@/lib/i18n/localized";
import { asLocalizedList } from "../casting";

/**
 * Reference/override resolution, shared by every slot.
 *
 * A slot can *reference* a catalog entity (read the displayed copy/image off the
 * linked row) or *override* it (use the slot's own columns). The CTA destination
 * is ALWAYS the linked entity's canonical route: overriding changes what is
 * displayed, never where the button goes.
 *
 * ── THE RULE: an explicit admin value always wins ───────────────────────────
 *
 * Each override column is independently nullable, so resolution is PER FIELD:
 *
 *   - the slot's own value, when it has one;
 *   - otherwise the linked entity's value.
 *
 * This used to be gated on the slot's `mode` column, and that gating is what
 * produced the "saved in the admin but the homepage shows the old image"
 * report: a slot could sit in `reference` mode while holding an image and a
 * paragraph the admin had uploaded and saved, and every one of them was
 * silently discarded in favour of the linked entity. Nothing on the homepage
 * said so, and the admin's own content was the one thing they could see was
 * missing.
 *
 * Gating on the mode is also impossible to reconcile with the form, which
 * always shows the override fields and always persists what they contain — so
 * saving them had no effect unless a separate control was also changed. The
 * mode remains as a record of how the slot was configured, and `resolveField`
 * still accepts it so call sites stay explicit about which slot they resolve,
 * but the admin's saved value is now authoritative.
 *
 * A field the admin deliberately CLEARED is stored as SQL NULL (the form maps
 * "" to NULL), so clearing a field still means "use the linked entity's value".
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
 * The slot's own value when it has one, otherwise the linked entity's.
 *
 * `mode` is accepted but no longer gates the result — see the module note.
 */
export function resolveField<T>(
  _mode: boolean,
  override: T | null | undefined,
  reference: T,
): T {
  return override ?? reference;
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
