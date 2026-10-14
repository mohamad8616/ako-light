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
  "admin.project.card.textImageSection": "Text + image section",
  "admin.project.card.textImageSectionHint":
    "The block under the gallery: a paragraph beside a photo.",
  "admin.project.card.fullImageSection": "Full-width image section",
  "admin.project.card.fullImageSectionHint":
    "The wide photo under the text + image block, with a caption below it.",
  "admin.project.field.location": "Location",
  "admin.project.field.paragraph": "Intro paragraph",
  "admin.project.field.moreDescription": "More description",
  "admin.project.field.credits": "Credits",
  "admin.project.field.creditsHint":
    "One line per credit, in both languages.",
  "admin.project.field.portfolioImages": "Portfolio images",
  "admin.project.field.portfolioImagesHint":
    "The gallery under the story. Order is the display order.",
  "admin.project.field.image": "Main image",
  "admin.project.field.imageHint":
    "The full-width image at the top of the project page.",
  "admin.project.field.sectionImage": "Section photo",
  "admin.project.field.sectionImageHint":
    "Leave empty to use the gallery photo at this position.",
  "admin.project.field.sectionText": "Section paragraph",
  "admin.project.field.sectionTextHint":
    "Both languages are needed, or leave both empty to use the matching “More description” entry.",
  "admin.project.field.sectionCaption": "Caption",
  "admin.project.field.sectionCaptionHint":
    "Both languages are needed, or leave both empty to use the matching “More description” entry.",
  "admin.project.field.productsUsed": "Products used",
  "admin.project.field.productsUsedHint":
    "Pick a category, then a product. Reorder with the arrows, remove with ×.",
  "admin.project.field.productsCategory": "Category",
  "admin.project.field.productsProduct": "Product",
  "admin.project.field.productsCategoryEmpty":
    "Every product in this category is already added.",
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
  "admin.project.card.textImageSection": "بخش متن و تصویر",
  "admin.project.card.textImageSectionHint":
    "بلوک زیر گالری: یک پاراگراف در کنار یک تصویر.",
  "admin.project.card.fullImageSection": "بخش تصویر تمام‌عرض",
  "admin.project.card.fullImageSectionHint":
    "تصویر پهن زیر بخش متن و تصویر، با توضیح در زیر آن.",
  "admin.project.field.location": "موقعیت",
  "admin.project.field.paragraph": "پاراگراف معرفی",
  "admin.project.field.moreDescription": "توضیحات بیشتر",
  "admin.project.field.credits": "اعتبارها",
  "admin.project.field.creditsHint": "هر اعتبار در یک خط، به هر دو زبان.",
  "admin.project.field.portfolioImages": "تصاویر نمونه‌کار",
  "admin.project.field.portfolioImagesHint":
    "گالری زیر روایت. ترتیب همان ترتیب نمایش است.",
  "admin.project.field.image": "تصویر اصلی",
  "admin.project.field.imageHint":
    "تصویر تمام‌عرض بالای صفحه پروژه.",
  "admin.project.field.sectionImage": "تصویر بخش",
  "admin.project.field.sectionImageHint":
    "اگر خالی بماند، تصویر گالری در همین جایگاه استفاده می‌شود.",
  "admin.project.field.sectionText": "پاراگراف بخش",
  "admin.project.field.sectionTextHint":
    "هر دو زبان لازم است؛ یا هر دو را خالی بگذارید تا مورد متناظر «توضیحات بیشتر» استفاده شود.",
  "admin.project.field.sectionCaption": "توضیح تصویر",
  "admin.project.field.sectionCaptionHint":
    "هر دو زبان لازم است؛ یا هر دو را خالی بگذارید تا مورد متناظر «توضیحات بیشتر» استفاده شود.",
  "admin.project.field.productsUsed": "محصولات استفاده‌شده",
  "admin.project.field.productsUsedHint":
    "ابتدا دسته و سپس محصول را انتخاب کنید. با فلش‌ها جابه‌جا و با × حذف کنید.",
  "admin.project.field.productsCategory": "دسته‌بندی",
  "admin.project.field.productsProduct": "محصول",
  "admin.project.field.productsCategoryEmpty":
    "همهٔ محصولات این دسته قبلاً افزوده شده‌اند.",
  "admin.project.deleteWarning": "پیوندهای محصولات این پروژه نیز حذف می‌شوند.",

  // جایگاه‌های بنر صفحه اصلی (app/[locale]/(admin)/admin/homepage)
} as const;
