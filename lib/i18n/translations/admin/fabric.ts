/**
 * Admin-only translations — the `admin.fabric.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const fabricEn = {
  "admin.fabric.field.code": "Code",
  "admin.fabric.field.category": "Category",
  "admin.fabric.field.swatchColor": "Swatch color",

} as const;

export const fabricFa = {
  "admin.fabric.field.code": "کد",
  "admin.fabric.field.category": "دسته‌بندی",
  "admin.fabric.field.swatchColor": "رنگ نمونه",

} as const;
