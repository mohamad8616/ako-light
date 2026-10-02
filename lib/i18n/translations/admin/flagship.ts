/**
 * Admin-only translations — the `admin.flagship.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const flagshipEn = {
  "admin.flagship.new": "New flagship",
  "admin.flagship.edit": "Edit flagship",
  "admin.flagship.card.identity": "Identity",
  "admin.flagship.card.detail": "Detail page",
  "admin.flagship.card.detailHint":
    "The optional detail block rendered on the public flagship page.",
  "admin.flagship.field.city": "City",
  "admin.flagship.field.hasDetail": "Detail page",
  "admin.flagship.field.hasDetailHint": "Publish a detail page for this store.",
  "admin.flagship.field.heading": "Heading",
  "admin.flagship.field.heroImage": "Hero image",
  "admin.flagship.field.detailName": "Store name (detail block)",
  "admin.flagship.field.addressLines": "Address lines",
  "admin.flagship.field.addressLinesHint":
    "Each line is either a plain string or a localized pair.",
  "admin.flagship.field.hours": "Opening hours",
  "admin.flagship.field.appointmentNote": "Appointment note",
  "admin.flagship.field.phone": "Phone",
  "admin.flagship.field.email": "Email",
  "admin.flagship.field.videoThumbnail": "Video thumbnail",
  "admin.flagship.field.videoUrl": "Video URL",
  "admin.flagship.field.gallery": "Gallery",
  "admin.flagship.detail.present": "Published",
  "admin.flagship.detail.absent": "None",
  "admin.flagship.deleteWarning":
    "The flagship's detail page content is removed with it.",

} as const;

export const flagshipFa = {
  "admin.flagship.new": "فلگ‌شپ جدید",
  "admin.flagship.edit": "ویرایش فلگ‌شپ",
  "admin.flagship.card.identity": "هویت",
  "admin.flagship.card.detail": "صفحه جزئیات",
  "admin.flagship.card.detailHint":
    "بلوک اختیاری جزئیات که در صفحه عمومی فلگ‌شپ نمایش داده می‌شود.",
  "admin.flagship.field.city": "شهر",
  "admin.flagship.field.hasDetail": "صفحه جزئیات",
  "admin.flagship.field.hasDetailHint": "انتشار صفحه جزئیات برای این شوروم.",
  "admin.flagship.field.heading": "سرآیند",
  "admin.flagship.field.heroImage": "تصویر اصلی",
  "admin.flagship.field.detailName": "نام فروشگاه (بلوک جزئیات)",
  "admin.flagship.field.addressLines": "خطوط آدرس",
  "admin.flagship.field.addressLinesHint":
    "هر خط می‌تواند متن ساده یا جفت محلی‌سازی‌شده باشد.",
  "admin.flagship.field.hours": "ساعات کاری",
  "admin.flagship.field.appointmentNote": "یادداشت نوبت‌دهی",
  "admin.flagship.field.phone": "تلفن",
  "admin.flagship.field.email": "ایمیل",
  "admin.flagship.field.videoThumbnail": "تصویر بندانگشتی ویدیو",
  "admin.flagship.field.videoUrl": "نشانی ویدیو",
  "admin.flagship.field.gallery": "گالری",
  "admin.flagship.detail.present": "منتشرشده",
  "admin.flagship.detail.absent": "ندارد",
  "admin.flagship.deleteWarning":
    "محتوای صفحه جزئیات این فلگ‌شپ نیز حذف می‌شود.",

} as const;
