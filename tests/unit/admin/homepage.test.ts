import {
  HOMEPAGE_HREF,
  HOMEPAGE_SLOT_KEYS,
  HOMEPAGE_SLOT_META,
  homepageSlotHref,
  isHomepageSlot,
} from "@/lib/admin/homepage";
import { adminTranslations } from "@/lib/i18n/admin-translations";
import { describe, expect, it } from "vitest";

/**
 * Part D — the homepage slot registry.
 *
 * The registry is what the hub and the `[slot]` edit route both trust: the
 * keys address the singleton rows, and the label/description keys must resolve
 * in BOTH dictionaries or the page renders raw keys.
 */
describe("homepage slot registry", () => {
  it("knows every slot exactly once", () => {
    expect(HOMEPAGE_SLOT_KEYS).toHaveLength(5);
    expect(new Set(HOMEPAGE_SLOT_KEYS).size).toBe(HOMEPAGE_SLOT_KEYS.length);
    expect([...HOMEPAGE_SLOT_KEYS].sort()).toEqual(Object.keys(HOMEPAGE_SLOT_META).sort());
  });

  it("recognises a slot route segment and rejects anything else", () => {
    expect(isHomepageSlot("flagship-one")).toBe(true);
    expect(isHomepageSlot("catalogue")).toBe(true);
    expect(isHomepageSlot("new")).toBe(false);
    expect(isHomepageSlot("")).toBe(false);
  });

  it("builds the edit route under the hub", () => {
    expect(homepageSlotHref("project-dark-background")).toBe(
      "/admin/homepage/project-dark-background",
    );
    expect(HOMEPAGE_HREF).toBe("/admin/homepage");
  });

  it("describes every slot with keys that exist in both dictionaries", () => {
    // Slot labels/descriptions are admin-only strings — read them from the admin
    // dictionary, not the public barrel (see lib/i18n/admin-translations.ts).
    for (const [slot, meta] of Object.entries(HOMEPAGE_SLOT_META)) {
      expect(adminTranslations.en, slot).toHaveProperty(meta.labelKey);
      expect(adminTranslations.fa, slot).toHaveProperty(meta.labelKey);
      expect(adminTranslations.en, slot).toHaveProperty(meta.descriptionKey);
      expect(adminTranslations.fa, slot).toHaveProperty(meta.descriptionKey);
    }
  });
});
