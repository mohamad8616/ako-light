/**
 * Admin-only translations — the `admin.productCategory.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const productCategoryEn = {
  "admin.productCategory.field.i18nKey": "i18n key",

} as const;

export const productCategoryFa = {
  "admin.productCategory.field.i18nKey": "کلید i18n",

} as const;
