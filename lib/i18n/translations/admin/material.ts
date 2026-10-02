/**
 * Admin-only translations — the `admin.material.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const materialEn = {
  "admin.material.field.category": "Category",
  "admin.material.field.type": "Type",
  "admin.material.field.description": "Description",

} as const;

export const materialFa = {
  "admin.material.field.category": "دسته‌بندی",
  "admin.material.field.type": "نوع",
  "admin.material.field.description": "توضیحات",

} as const;
