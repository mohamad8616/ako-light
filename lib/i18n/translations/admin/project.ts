/**
 * Admin-only translations — the `admin.project.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const projectEn = {
  "admin.project.new": "New project",
  "admin.project.edit": "Edit project",
  "admin.project.card.identity": "Identity",
  "admin.project.card.content": "Story",
  "admin.project.card.media": "Media",
  "admin.project.card.products": "Products used",
  "admin.project.field.i18nKey": "i18n key",
  "admin.project.field.location": "Location",
  "admin.project.field.paragraph": "Intro paragraph",
  "admin.project.field.moreDescription": "More description",
  "admin.project.field.credits": "Credits",
  "admin.project.field.creditsHint":
    "Each entry is either a plain string or a localized pair.",
  "admin.project.field.portfolioImages": "Portfolio images",
  "admin.project.field.productsUsed": "Products used",
  "admin.project.field.productsUsedHint":
    "Ordered list — reorder with the arrows, remove with ×.",
  "admin.project.deleteWarning":
    "The project's product links are removed with it.",

  // Homepage feature slots (app/[locale]/(admin)/admin/homepage)
} as const;

export const projectFa = {
  "admin.project.new": "پروژه جدید",
  "admin.project.edit": "ویرایش پروژه",
  "admin.project.card.identity": "هویت",
  "admin.project.card.content": "روایت",
  "admin.project.card.media": "رسانه",
  "admin.project.card.products": "محصولات استفاده‌شده",
  "admin.project.field.i18nKey": "کلید i18n",
  "admin.project.field.location": "موقعیت",
  "admin.project.field.paragraph": "پاراگراف معرفی",
  "admin.project.field.moreDescription": "توضیحات بیشتر",
  "admin.project.field.credits": "اعتبارها",
  "admin.project.field.creditsHint":
    "هر مورد می‌تواند متن ساده یا جفت محلی‌سازی‌شده باشد.",
  "admin.project.field.portfolioImages": "تصاویر نمونه‌کار",
  "admin.project.field.productsUsed": "محصولات استفاده‌شده",
  "admin.project.field.productsUsedHint":
    "فهرست مرتب — با فلش‌ها جابه‌جا و با × حذف کنید.",
  "admin.project.deleteWarning": "پیوندهای محصولات این پروژه نیز حذف می‌شوند.",

  // جایگاه‌های بنر صفحه اصلی (app/[locale]/(admin)/admin/homepage)
} as const;
