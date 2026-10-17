import type { Localized } from "@/lib/i18n/localized";

/** Legacy rows stay out of public catalogs until they have complete copy + art. */
export function isMaterialItemPubliclyReady(
  item: { name: Localized; image: string | null | undefined },
): item is { name: Localized; image: string } {
  return Boolean(item.image?.trim() && item.name.en.trim() && item.name.fa.trim());
}
