/**
 * Admin-only translations — the `admin.upload.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const uploadEn = {
  "admin.upload.pick": "Upload image",
  "admin.upload.fromLibrary": "Select from library",
  "admin.upload.remove": "Remove",
  "admin.upload.uploading": "Uploading…",
  "admin.upload.done": "Image uploaded",
  "admin.upload.empty": "No image",
  "admin.upload.hint": "JPEG, PNG, WebP or AVIF · up to 5 MB",
  // The catalogue CTA's downloadable PDF (Pass C.4). Its own keys because a PDF
  // is not an image: the picker, the empty state and the success message all
  // have to say so, or an operator who uploads a catalogue is told an "image"
  // was uploaded.
  "admin.upload.pdfPick": "Upload PDF",
  "admin.upload.pdfReplace": "Replace PDF",
  "admin.upload.pdfEmpty": "No PDF uploaded",
  "admin.upload.pdfDone": "PDF uploaded",
  "admin.upload.pdfHint": "PDF · up to 5 MB",
  "admin.upload.pdfDownloadHint":
    "The button downloads this file. Leave it empty to use the button link, or the catalogue's own PDF.",

  // Media library (app/[locale]/(admin)/admin/media + components/admin/media/*)
} as const;

export const uploadFa = {
  "admin.upload.pick": "آپلود تصویر",
  "admin.upload.fromLibrary": "انتخاب از کتابخانه",
  "admin.upload.remove": "حذف",
  "admin.upload.uploading": "در حال آپلود…",
  "admin.upload.done": "تصویر آپلود شد",
  "admin.upload.empty": "بدون تصویر",
  "admin.upload.hint": "JPEG، PNG، WebP یا AVIF · حداکثر ۵ مگابایت",

  // دکمهٔ فراخوان کاتالوگ (پاس C.4)
  "admin.upload.pdfPick": "آپلود فایل PDF",
  "admin.upload.pdfReplace": "جایگزینی فایل PDF",
  "admin.upload.pdfEmpty": "فایل PDF آپلود نشده است",
  "admin.upload.pdfDone": "فایل PDF آپلود شد",
  "admin.upload.pdfHint": "PDF · حداکثر ۵ مگابایت",
  "admin.upload.pdfDownloadHint":
    "دکمه همین فایل را دانلود می‌کند. اگر خالی بماند، پیوند دکمه یا فایل PDF خود کاتالوگ استفاده می‌شود.",

  // کتابخانه رسانه (app/[locale]/(admin)/admin/media و components/admin/media/*)
} as const;
