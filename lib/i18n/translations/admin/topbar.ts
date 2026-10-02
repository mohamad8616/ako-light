/**
 * Admin-only translations — the `admin.topbar.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const topbarEn = {
  "admin.topbar.greeting": "Welcome",
  "admin.topbar.signOut": "Sign out",
} as const;

export const topbarFa = {
  "admin.topbar.greeting": "خوش آمدید",
  "admin.topbar.signOut": "خروج",
} as const;
