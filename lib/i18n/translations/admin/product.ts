/**
 * Admin-only translations — the `admin.product.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const productEn = {
  "admin.product.new": "New product",
  "admin.product.edit": "Edit product",
  "admin.product.card.identity": "Identity",
  "admin.product.card.pricing": "Pricing & stock",
  "admin.product.card.media": "Media",
  "admin.product.card.content": "Content",
  "admin.product.card.extras": "Extras",
  "admin.product.card.danger": "Danger zone",
  "admin.product.field.name": "Name",
  "admin.product.field.slug": "Slug",
  "admin.product.field.sortOrder": "Sort order",
  "admin.product.field.category": "Category",
  "admin.product.field.designer": "Designer",
  "admin.product.field.priceEur": "Price (EUR) — shown to English visitors",
  "admin.product.field.priceToman":
    "Price (Toman) — shown to Persian visitors and charged at checkout",
  "admin.product.field.quantity": "Quantity",
  "admin.product.field.existsInStore": "Available in store",
  "admin.product.field.hoverImage": "Hover image",
  "admin.product.field.heroImage": "Hero image",
  "admin.product.field.images": "Images",
  "admin.product.field.description": "Description",
  "admin.product.field.moreInfo": "More info",
  "admin.product.field.downloads": "Downloads",
  "admin.product.field.href": "Link",
  "admin.product.field.related": "Related products",
  "admin.product.field.stock": "Stock",
  "admin.product.stock.in": "In stock",
  "admin.product.stock.out": "Out of stock",
  "admin.product.deleteWarning": "This action cannot be undone.",

} as const;

export const productFa = {
  "admin.product.new": "محصول جدید",
  "admin.product.edit": "ویرایش محصول",
  "admin.product.card.identity": "هویت",
  "admin.product.card.pricing": "قیمت و موجودی",
  "admin.product.card.media": "رسانه",
  "admin.product.card.content": "محتوا",
  "admin.product.card.extras": "موارد اضافه",
  "admin.product.card.danger": "منطقه خطر",
  "admin.product.field.name": "نام",
  "admin.product.field.slug": "اسلاگ",
  "admin.product.field.sortOrder": "ترتیب نمایش",
  "admin.product.field.category": "دسته‌بندی",
  "admin.product.field.designer": "طراح",
  "admin.product.field.priceEur":
    "قیمت (یورو) — نمایش به بازدیدکنندگان انگلیسی‌زبان",
  "admin.product.field.priceToman":
    "قیمت (تومان) — نمایش به بازدیدکنندگان فارسی‌زبان و مبلغ پرداخت در تسویه",
  "admin.product.field.quantity": "تعداد",
  "admin.product.field.existsInStore": "در فروشگاه موجود است",
  "admin.product.field.hoverImage": "تصویر hover",
  "admin.product.field.heroImage": "تصویر اصلی",
  "admin.product.field.images": "تصاویر",
  "admin.product.field.description": "توضیحات",
  "admin.product.field.moreInfo": "اطلاعات بیشتر",
  "admin.product.field.downloads": "دانلودها",
  "admin.product.field.href": "پیوند",
  "admin.product.field.related": "محصولات مرتبط",
  "admin.product.field.stock": "موجودی",
  "admin.product.stock.in": "موجود",
  "admin.product.stock.out": "ناموجود",
  "admin.product.deleteWarning": "این اقدام قابل بازگشت نیست.",

} as const;
