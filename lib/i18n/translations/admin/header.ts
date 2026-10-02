/**
 * Admin-only translations — the `admin.header.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const headerEn = {
  "admin.header.title": "Dashboard",

  // Data table
} as const;

export const headerFa = {
  "admin.header.title": "داشبورد",

  // جدول داده
} as const;
