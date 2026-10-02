/**
 * Admin-only translations — the `admin.designer.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const designerEn = {
  "admin.designer.field.image": "Image",
  "admin.designer.field.website": "Website",
  "admin.designer.field.bio": "Biography",
  "admin.designer.field.bioHint": "Biography and profile text",
  "admin.designer.field.products": "Products",

} as const;

export const designerFa = {
  "admin.designer.field.image": "تصویر",
  "admin.designer.field.website": "وب‌سایت",
  "admin.designer.field.bio": "بیوگرافی",
  "admin.designer.field.bioHint": "متن بیوگرافی و پروفایل",
  "admin.designer.field.products": "محصولات",

} as const;
