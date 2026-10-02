/**
 * Admin-only translations — the `admin.page.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const pageEn = {
  "admin.page.about.section.heroSection": "Hero",
  "admin.page.about.section.subtitleSection": "Subtitle",
  "admin.page.about.section.brandStorySection": "Brand story",
  "admin.page.about.section.eleganceSection": "Elegance",
  "admin.page.s34.section.heroSection": "Hero",
  "admin.page.s34.section.conceptSection": "Concept",
  "admin.page.s34.section.gallerySection": "Gallery",
  "admin.page.s34.section.harmonySection": "Harmony",
  "admin.page.field.firstLine": "First line",
  "admin.page.field.secondLine": "Second line",
  "admin.page.field.subtitle": "Subtitle",
  "admin.page.field.title": "Title",
  "admin.page.field.kicker": "Kicker",
  "admin.page.field.paragraph": "Paragraph",
  "admin.page.field.paragraphs": "Paragraphs",
  "admin.page.field.paragraphsHint":
    "Ordered list — reorder with the arrows, remove with ×. Every row needs both languages.",
  "admin.page.field.block1Alt": "Block 1 image alt text",
  "admin.page.field.block1Paragraphs": "Block 1 paragraphs",
  "admin.page.field.block2Alt": "Block 2 image alt text",
  "admin.page.field.block2Paragraph": "Block 2 paragraph",

  // The remaining codes of the shared action contract (lib/admin/result.ts).
  // `tooLong` is produced by the `.max()` caps in lib/admin/schemas/common.ts:
  // oversize input maps to this code instead of the bare zod default message.
} as const;

export const pageFa = {
  "admin.page.about.section.heroSection": "بخش هیرو",
  "admin.page.about.section.subtitleSection": "زیرعنوان",
  "admin.page.about.section.brandStorySection": "داستان برند",
  "admin.page.about.section.eleganceSection": "شکوه و ظرافت",
  "admin.page.s34.section.heroSection": "بخش هیرو",
  "admin.page.s34.section.conceptSection": "مفهوم",
  "admin.page.s34.section.gallerySection": "گالری",
  "admin.page.s34.section.harmonySection": "هماهنگی",
  "admin.page.field.firstLine": "خط اول",
  "admin.page.field.secondLine": "خط دوم",
  "admin.page.field.subtitle": "زیرعنوان",
  "admin.page.field.title": "عنوان",
  "admin.page.field.kicker": "پیش‌عنوان",
  "admin.page.field.paragraph": "پاراگراف",
  "admin.page.field.paragraphs": "پاراگراف‌ها",
  "admin.page.field.paragraphsHint":
    "فهرست مرتب — با فلش‌ها جابه‌جا و با × حذف کنید. هر ردیف به هر دو زبان نیاز دارد.",
  "admin.page.field.block1Alt": "متن جانشین تصویر بلوک ۱",
  "admin.page.field.block1Paragraphs": "پاراگراف‌های بلوک ۱",
  "admin.page.field.block2Alt": "متن جانشین تصویر بلوک ۲",
  "admin.page.field.block2Paragraph": "پاراگراف بلوک ۲",

  // کدهای باقی‌ماندهٔ قرارداد مشترک اکشن‌ها (lib/admin/result.ts)
  // کد «tooLong» از سقف‌های `.max()` در lib/admin/schemas/common.ts می‌آید.
} as const;
