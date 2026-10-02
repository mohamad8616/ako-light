/**
 * Admin-only translations — the `admin.overview.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const overviewEn = {
  "admin.overview.title": "Overview",
  "admin.overview.subtitle": "Operational snapshot across the catalog",
} as const;

export const overviewFa = {
  "admin.overview.title": "نمای کلی",
  "admin.overview.subtitle": "نمایی از وضعیت کلی کاتالوگ",
} as const;
