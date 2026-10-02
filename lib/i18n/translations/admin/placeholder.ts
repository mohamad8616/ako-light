/**
 * Admin-only translations — the `admin.placeholder.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const placeholderEn = {
  "admin.placeholder.title": "Coming soon",
  "admin.placeholder.description": "This admin section is under construction.",
  "admin.placeholder.back": "Back to dashboard",
} as const;

export const placeholderFa = {
  "admin.placeholder.title": "به‌زودی",
  "admin.placeholder.description": "این بخش از پنل مدیریت در حال توسعه است.",
  "admin.placeholder.back": "بازگشت به داشبورد",
} as const;
