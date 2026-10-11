/**
 * Admin-only translations — the `admin.header.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const headerEn = {
  "admin.header.title": "Dashboard",
  // Pass D.1 — the compact shell navigation.
  "admin.header.home": "View site",
  "admin.header.language": "Language",
  // Deliberately the language's OWN name in both dictionaries: a switcher that
  // names a language in the language the user cannot read is useless.
  "admin.header.lang.en": "English",
  "admin.header.lang.fa": "فارسی",

  // Data table
} as const;

export const headerFa = {
  "admin.header.title": "داشبورد",
  // پاس D.1 — ناوبری فشردهٔ پوسته
  "admin.header.home": "مشاهده سایت",
  "admin.header.language": "زبان",
  "admin.header.lang.en": "English",
  "admin.header.lang.fa": "فارسی",

  // جدول داده
} as const;
