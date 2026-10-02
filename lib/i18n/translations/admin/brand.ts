/**
 * Admin-only translations — the `admin.brand.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const brandEn = {
  "admin.brand": "Home Form",
  "admin.brand.subtitle": "Admin Panel",

  // Roles
} as const;

export const brandFa = {
  "admin.brand": "Home Form",
  "admin.brand.subtitle": "پنل مدیریت",

  // نقش‌ها
} as const;
