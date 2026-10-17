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
  "admin.collection.field.gallery": "Image gallery",
  "admin.collection.field.galleryHint": "At least 5 photos",
  "admin.collection.field.productsUsed": "Products used",
  "admin.collection.field.productsUsedHint":
    "Pick the products shown in this collection",
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
  "admin.collection.field.gallery": "گالری تصاویر",
  "admin.collection.field.galleryHint": "حداقل ۵ عکس",
  "admin.collection.field.productsUsed": "محصولات استفاده‌شده",
  "admin.collection.field.productsUsedHint":
    "محصولات نمایش‌داده‌شده در این مجموعه را انتخاب کنید",
} as const;
