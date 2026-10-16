import type { AdminTranslationKey } from "@/lib/i18n/admin-translations";


/**
 * Homepage section registry — the admin-side companion to
 * lib/repositories/homepage-features.ts.
 *
 * A homepage banner is a SINGLETON configuration row, not a list row, so the
 * admin has no id to look up: the section key IS the primary key (see the
 * seed), and the lookup key for the labels below. Keeping that mapping here
 * means the admin page can never disagree with the repository about which
 * sections exist, exactly like lib/admin/sections.ts does for the sidebar.
 *
 * Instructions:
 *   - Keep this a pure data module: no React, no Prisma, no "use client". It is
 *     imported by both server pages and client forms, so it must stay free of
 *     the server-only repository module (the section keys are spelled out here
 *     on purpose).
 *   - `labelKey`/`descriptionKey` must exist in BOTH dictionaries of
 *     lib/i18n/translations/admin.ts (tests/unit/i18n/translations.test.ts keeps
 *     the en/fa key sets identical, and tests/unit/admin/sections.test.ts
 *     already checks every nav item's key).
 *   - The key order mirrors the order the homepage renders its banners in
 *     (app/[locale]/(site)/page.tsx), so the admin page — which renders one form
 *     per key, top to bottom — reads like the page it configures. That order is
 *     a contract: tests/unit/admin/homepage.test.ts pins it AND asserts the
 *     admin page composes its forms in the same sequence.
 *
 * The About and S34 hero videos are NOT sections here: they are extra
 * `hero_feature` singleton rows, but they belong to their own pages and are
 * edited on /admin/about and /admin/s34 (see getPageHeroMedia). The homepage
 * admin page owns the homepage only.
 */

/** The homepage admin route (locale-less — Link adds the prefix). */
export const HOMEPAGE_HREF = "/admin/homepage";

/** Every section key = the row's id in prisma/seed.ts. */
export const HOMEPAGE_SLOT_KEYS = [
  "hero",
  "flagship-one",
  "video",
  "catalogue",
  "home-collection",
  "project-banner",
  "project-dark-background",
] as const;

export type HomepageSlotKey = (typeof HOMEPAGE_SLOT_KEYS)[number];

export interface HomepageSlotMeta {
  /** Section name shown as the heading above the section's form. */
  labelKey: AdminTranslationKey;
  /** One-line explanation of where the banner appears. */
  descriptionKey: AdminTranslationKey;
}

export const HOMEPAGE_SLOT_META: Record<HomepageSlotKey, HomepageSlotMeta> = {
  hero: {
    labelKey: "admin.homepage.slot.hero",
    descriptionKey: "admin.homepage.slot.hero.description",
  },
  "flagship-one": {
    labelKey: "admin.homepage.slot.flagship-one",
    descriptionKey: "admin.homepage.slot.flagship-one.description",
  },
  video: {
    labelKey: "admin.homepage.slot.video",
    descriptionKey: "admin.homepage.slot.video.description",
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
