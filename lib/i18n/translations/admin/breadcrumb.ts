/**
 * Admin-only translations — the `admin.breadcrumb.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const breadcrumbEn = {
  "admin.breadcrumb.label": "Breadcrumb",
  "admin.breadcrumb.root": "Admin",

  // Brand header (sidebar)
} as const;

export const breadcrumbFa = {
  "admin.breadcrumb.label": "مسیر صفحه",
  "admin.breadcrumb.root": "مدیریت",

  // برند (هدر سایدبار)
} as const;
