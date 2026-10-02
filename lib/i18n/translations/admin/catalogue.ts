/**
 * Admin-only translations — the `admin.catalogue.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const catalogueEn = {
  "admin.catalogue.field.title": "Title",
  "admin.catalogue.field.href": "Link",
  "admin.catalogue.field.coverColor": "Cover color",
  "admin.catalogue.field.coverTextColor": "Cover text color",

} as const;

export const catalogueFa = {
  "admin.catalogue.field.title": "عنوان",
  "admin.catalogue.field.href": "پیوند",
  "admin.catalogue.field.coverColor": "رنگ جلد",
  "admin.catalogue.field.coverTextColor": "رنگ متن جلد",

} as const;
