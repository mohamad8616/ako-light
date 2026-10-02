/**
 * Admin-only translations — the `admin.card.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const cardEn = {
  "admin.card.products.hint": "All products registered in the catalog",
  "admin.card.designers.hint": "Designer profiles published on the site",
  "admin.card.collections.hint": "Curated collections currently listed",
  "admin.card.materials.hint": "Materials available for product finishes",
  "admin.card.flagships.hint": "Flagship stores and showrooms",
  "admin.card.projects.hint": "Projects showcased on the site",

  // Site header
} as const;

export const cardFa = {
  "admin.card.products.hint": "همهٔ محصولات ثبت‌شده در کاتالوگ",
  "admin.card.designers.hint": "پروفایل طراحان منتشرشده در سایت",
  "admin.card.collections.hint": "مجموعه‌های فعلی نمایش‌داده‌شده",
  "admin.card.materials.hint": "مواد موجود برای پرداخت محصول‌ها",
  "admin.card.flagships.hint": "فروشگاه‌های شاخص و نمایشگاه‌ها",
  "admin.card.projects.hint": "پروژه‌های نمایش‌داده‌شده در سایت",

  // هدر صفحه
} as const;
