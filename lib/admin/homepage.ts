import type { TranslationKey } from "@/lib/i18n/translations";

/**
 * Homepage slot registry — the admin-side companion to
 * lib/repositories/homepage-features.ts.
 *
 * A homepage banner is a SINGLETON configuration row, not a list row, so the
 * admin has no id to look up: the slot key IS the primary key (see the seed),
 * the edit route's segment, and the lookup key for the labels below. Keeping
 * that mapping here means the hub page and the per-slot edit page can never
 * disagree about which slots exist, exactly like lib/admin/sections.ts does for
 * the sidebar.
 *
 * Instructions:
 *   - Keep this a pure data module: no React, no Prisma, no "use client". It is
 *     imported by both server pages and client forms, so it must stay free of
 *     the server-only repository module (the slot keys are spelled out here on
 *     purpose).
 *   - `labelKey`/`descriptionKey` must exist in BOTH dictionaries of
 *     lib/i18n/translations/admin.ts (tests/unit/i18n/translations.test.ts keeps
 *     the en/fa key sets identical, and tests/unit/admin/sections.test.ts
 *     already checks every nav item's key).
 *   - The key order mirrors the order the homepage renders its banners in
 *     (app/[locale]/(site)/page.tsx), so screens that read this registry
 *     top-to-bottom match the page they configure.
 */

/** The homepage section's hub route (locale-less — Link adds the prefix). */
export const HOMEPAGE_HREF = "/admin/homepage";

/** Every slot key = the row's id in prisma/seed.ts. */
export const HOMEPAGE_SLOT_KEYS = [
  "flagship-one",
  "catalogue",
  "home-collection",
  "project-banner",
  "project-dark-background",
] as const;

export type HomepageSlotKey = (typeof HOMEPAGE_SLOT_KEYS)[number];

export interface HomepageSlotMeta {
  /** Slot name as the hub card and the edit page heading show it. */
  labelKey: TranslationKey;
  /** One-line explanation of where the banner appears. */
  descriptionKey: TranslationKey;
}

export const HOMEPAGE_SLOT_META: Record<HomepageSlotKey, HomepageSlotMeta> = {
  "flagship-one": {
    labelKey: "admin.homepage.slot.flagship-one",
    descriptionKey: "admin.homepage.slot.flagship-one.description",
  },
  catalogue: {
    labelKey: "admin.homepage.slot.catalogue",
    descriptionKey: "admin.homepage.slot.catalogue.description",
  },
  "home-collection": {
    labelKey: "admin.homepage.slot.home-collection",
    descriptionKey: "admin.homepage.slot.home-collection.description",
  },
  "project-banner": {
    labelKey: "admin.homepage.slot.project-banner",
    descriptionKey: "admin.homepage.slot.project-banner.description",
  },
  "project-dark-background": {
    labelKey: "admin.homepage.slot.project-dark-background",
    descriptionKey: "admin.homepage.slot.project-dark-background.description",
  },
};

/**
 * Whether an untrusted route segment names a slot. The `[slot]` edit route
 * calls this before touching the repository, so an unknown segment 404s
 * instead of rendering a slot that does not exist.
 */
export function isHomepageSlot(value: string): value is HomepageSlotKey {
  return (HOMEPAGE_SLOT_KEYS as readonly string[]).includes(value);
}

/** The edit route for one slot. */
export function homepageSlotHref(id: HomepageSlotKey): string {
  return `${HOMEPAGE_HREF}/${id}`;
}
