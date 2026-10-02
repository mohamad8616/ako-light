/**
 * Admin-only translations — the `admin.collection.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const collectionEn = {
  "admin.collection.new": "New collection",
  "admin.collection.edit": "Edit collection",
  "admin.collection.field.year": "Year",
  "admin.collection.field.description": "Description",
  "admin.collection.field.descriptionHint": "Collection narrative text",
  "admin.collection.field.descriptionP1": "Paragraph 1",
  "admin.collection.field.descriptionP2": "Paragraph 2",
  "admin.collection.field.descriptionP3": "Paragraph 3",

} as const;

export const collectionFa = {
  "admin.collection.new": "مجموعه جدید",
  "admin.collection.edit": "ویرایش مجموعه",
  "admin.collection.field.year": "سال",
  "admin.collection.field.description": "توضیحات",
  "admin.collection.field.descriptionHint": "متن روایت مجموعه",
  "admin.collection.field.descriptionP1": "پاراگراف ۱",
  "admin.collection.field.descriptionP2": "پاراگراف ۲",
  "admin.collection.field.descriptionP3": "پاراگراف ۳",

} as const;
