/**
 * Admin-only translations — the `admin.role.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const roleEn = {
  "admin.role.admin": "Admin",
  "admin.role.owner": "Owner",

  // Access denied (sign-in page) moved to auth.ts as auth.access.denied.* —
  // the sign-in page is public, so keeping these out of admin.ts is what lets
  // the admin dictionary stay out of the public client bundle.

  // Stat cards
} as const;

export const roleFa = {
  "admin.role.admin": "مدیر",
  "admin.role.owner": "مالک",

  // دسترسی غیرمجاز به auth.ts منتقل شد (auth.access.denied.*)

  // کارت‌های آماری
} as const;
