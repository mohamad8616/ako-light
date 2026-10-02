/**
 * Admin-only translations — the `admin.stat.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const statEn = {
  "admin.stat.products": "Products",
  "admin.stat.designers": "Designers",
  "admin.stat.collections": "Collections",
  "admin.stat.materials": "Materials",
  "admin.stat.flagships": "Flagships",
  "admin.stat.projects": "Projects",
} as const;

export const statFa = {
  "admin.stat.products": "محصولات",
  "admin.stat.designers": "طراحان",
  "admin.stat.collections": "مجموعه‌ها",
  "admin.stat.materials": "مواد",
  "admin.stat.flagships": "فلگ‌شپ‌ها",
  "admin.stat.projects": "پروژه‌ها",
} as const;
