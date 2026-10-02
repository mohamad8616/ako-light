/**
 * Admin-only translations — the `admin.homepage.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const homepageEn = {
  "admin.homepage.edit": "Configure",
  "admin.homepage.card.content": "Content",
  "admin.homepage.card.override": "Override content",
  "admin.homepage.card.overrideHint":
    "Leave a field empty to keep the linked entity's value. Values are kept when the banner returns to reference mode.",
  "admin.homepage.field.enabled": "Enabled",
  "admin.homepage.field.enabledHint": "Render this banner on the homepage.",
  "admin.homepage.field.mode": "Content mode",
  "admin.homepage.field.modeHint":
    "Reference shows the linked entity's own copy and image; override uses the fields below.",
  "admin.homepage.mode.reference": "Reference",
  "admin.homepage.mode.override": "Override",
  "admin.homepage.field.flagship": "Flagship",
  "admin.homepage.field.project": "Project",
  "admin.homepage.field.catalogueItem": "Catalogue item",
  "admin.homepage.field.catalogueItemHint":
    "The section's title and download link come from this item.",
  "admin.homepage.field.ctaHint":
    "The call to action always links to this entity's public page.",
  "admin.homepage.field.kicker": "Kicker",
  "admin.homepage.field.title": "Title",
  "admin.homepage.field.paragraphs": "Paragraphs",
  "admin.homepage.field.text": "Text",
  "admin.homepage.field.image": "Image",
  "admin.homepage.status.enabled": "Live",
  "admin.homepage.status.disabled": "Hidden",
  "admin.homepage.status.notConfigured": "Not configured",
  "admin.homepage.updatedAt": "Last saved",
  "admin.homepage.slot.flagship-one": "Flagship banner",
  "admin.homepage.slot.flagship-one.description":
    "The large flagship banner near the top of the homepage.",
  "admin.homepage.slot.project-banner": "Project banner",
  "admin.homepage.slot.project-banner.description":
    "The featured project banner.",
  "admin.homepage.slot.project-dark-background": "Project (dark background)",
  "admin.homepage.slot.project-dark-background.description":
    "The full-width dark project section.",
  "admin.homepage.slot.home-collection": "Home Collection banner",
  "admin.homepage.slot.home-collection.description":
    "Standalone banner linking to the collections index.",
  "admin.homepage.slot.catalogue": "Catalogue section",
  "admin.homepage.slot.catalogue.description":
    "The catalogue download section.",

  // Page-content sections (app/[locale]/(admin)/admin/about + .../s34) — the
  // prose sections of the About and S34 pages (myPlan.md Part D). Card titles
  // are addressed by section key so a form reads its own row's label.
} as const;

export const homepageFa = {
  "admin.homepage.edit": "تنظیم",
  "admin.homepage.card.content": "محتوا",
  "admin.homepage.card.override": "بازنویسی محتوا",
  "admin.homepage.card.overrideHint":
    "هر فیلد را خالی بگذارید تا مقدار موجودیت مرتبط نمایش داده شود. این مقادیر هنگام بازگشت به حالت ارجاع حفظ می‌شوند.",
  "admin.homepage.field.enabled": "فعال",
  "admin.homepage.field.enabledHint": "نمایش این بنر در صفحه اصلی.",
  "admin.homepage.field.mode": "حالت محتوا",
  "admin.homepage.field.modeHint":
    "حالت ارجاع متن و تصویر موجودیت مرتبط را نشان می‌دهد؛ حالت بازنویسی از فیلدهای زیر استفاده می‌کند.",
  "admin.homepage.mode.reference": "ارجاع",
  "admin.homepage.mode.override": "بازنویسی",
  "admin.homepage.field.flagship": "فروشگاه شاخص",
  "admin.homepage.field.project": "پروژه",
  "admin.homepage.field.catalogueItem": "ورودی کاتالوگ",
  "admin.homepage.field.catalogueItemHint":
    "عنوان و پیوند دانلود این بخش از همین ورودی خوانده می‌شود.",
  "admin.homepage.field.ctaHint":
    "دکمهٔ فراخوان همیشه به صفحهٔ عمومی این موجودیت پیوند می‌خورد.",
  "admin.homepage.field.kicker": "پیش‌عنوان",
  "admin.homepage.field.title": "عنوان",
  "admin.homepage.field.paragraphs": "پاراگراف‌ها",
  "admin.homepage.field.text": "متن",
  "admin.homepage.field.image": "تصویر",
  "admin.homepage.status.enabled": "فعال",
  "admin.homepage.status.disabled": "پنهان",
  "admin.homepage.status.notConfigured": "تنظیم‌نشده",
  "admin.homepage.updatedAt": "آخرین ذخیره",
  "admin.homepage.slot.flagship-one": "بنر فروشگاه شاخص",
  "admin.homepage.slot.flagship-one.description":
    "بنر بزرگ فروشگاه شاخص در بالای صفحه اصلی.",
  "admin.homepage.slot.project-banner": "بنر پروژه",
  "admin.homepage.slot.project-banner.description": "بنر پروژهٔ شاخص.",
  "admin.homepage.slot.project-dark-background": "پروژه (پس‌زمینهٔ تیره)",
  "admin.homepage.slot.project-dark-background.description":
    "بخش تیره و تمام‌عرض پروژه.",
  "admin.homepage.slot.home-collection": "بنر مجموعهٔ خانه",
  "admin.homepage.slot.home-collection.description":
    "بنر مستقل با پیوند به فهرست مجموعه‌ها.",
  "admin.homepage.slot.catalogue": "بخش کاتالوگ",
  "admin.homepage.slot.catalogue.description": "بخش دانلود کاتالوگ.",

  // بخش‌های محتوایی صفحه‌ها (admin/about و admin/s34) — بخش‌های متنی صفحه‌های
  // درباره ما و اس ۳۴ (myPlan.md بخش D). عنوان هر کارت با کلید بخش خوانده می‌شود.
} as const;
