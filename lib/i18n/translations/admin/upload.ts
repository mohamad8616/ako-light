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
  // What "Remove" does: the field clears AND the stored object is deleted. The
  // pending label covers the object delete, which is the part that takes time.
  "admin.upload.removing": "Removing…",
  "admin.upload.removed": "Removed",
  // A REQUIRED field is the exception: clearing it cannot be saved, so the file
  // is deliberately left in place rather than deleted under the live page.
  "admin.upload.clearedRequired":
    "Cleared. Choose a replacement before saving — this image is required.",
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

  // Catalogue-card files: a real uploaded PDF or PowerPoint presentation, never
  // a pasted link. Downloads are served through a same-origin attachment route.
  "admin.upload.documentPick": "Upload PDF or PowerPoint",
  "admin.upload.documentReplace": "Replace document",
  "admin.upload.documentEmpty": "No document uploaded",
  "admin.upload.documentDone": "Document uploaded",
  "admin.upload.documentSaving": "Verifying document…",
  "admin.upload.documentCleared": "Removed from this form. Save to apply the change.",
  "admin.upload.documentHint": "PDF or PowerPoint (.pptx) · up to 60 MB",

  // The VIDEO flavour of the same field (Pass D.1) — the hero video and the
  // video section. Its own keys for the same reason the PDF has its own: a
  // video is not an image, and being told an "image" was uploaded (or reading
  // the 5 MB image ceiling) is actively misleading.
  "admin.upload.pickVideo": "Upload video",
  "admin.upload.videoDone": "Video uploaded",
  "admin.upload.videoEmpty": "No video",
  "admin.upload.videoHint": "MP4 or WebM · up to 200 MB",
  // Shown in the preview box when the URL is set but will not load.
  "admin.upload.previewUnavailable": "Preview unavailable",

  // Media library (app/[locale]/(admin)/admin/media + components/admin/media/*)
} as const;

export const uploadFa = {
  "admin.upload.pick": "آپلود تصویر",
  "admin.upload.fromLibrary": "انتخاب از کتابخانه",
  "admin.upload.remove": "حذف",
  // دکمهٔ «حذف» هم فیلد را پاک می‌کند و هم فایل ذخیره‌شده را از انبار حذف می‌کند.
  "admin.upload.removing": "در حال حذف…",
  "admin.upload.removed": "حذف شد",
  // فیلد الزامی استثناست: پاک‌کردن آن ذخیره نمی‌شود، پس فایل عمداً دست‌نخورده
  // می‌ماند تا زیر صفحهٔ زنده حذف نشود.
  "admin.upload.clearedRequired":
    "پاک شد. پیش از ذخیره یک تصویر جانشین انتخاب کنید — این تصویر الزامی است.",
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

  // فایل کارت کاتالوگ: PDF یا ارائهٔ PowerPoint که به‌صورت فایل آپلود شده است.
  "admin.upload.documentPick": "آپلود PDF یا PowerPoint",
  "admin.upload.documentReplace": "جایگزینی سند",
  "admin.upload.documentEmpty": "سندی آپلود نشده است",
  "admin.upload.documentDone": "سند آپلود شد",
  "admin.upload.documentSaving": "در حال بررسی سند…",
  "admin.upload.documentCleared": "از این فرم حذف شد. برای اعمال، ذخیره کنید.",
  "admin.upload.documentHint": "PDF یا PowerPoint (.pptx) · حداکثر ۶۰ مگابایت",

  // نسخهٔ ویدیویی همان فیلد (پاس D.1) — ویدیوی هیرو و بخش ویدیو
  "admin.upload.pickVideo": "آپلود ویدیو",
  "admin.upload.videoDone": "ویدیو آپلود شد",
  "admin.upload.videoEmpty": "بدون ویدیو",
  "admin.upload.videoHint": "MP4 یا WebM · حداکثر ۲۰۰ مگابایت",
  "admin.upload.previewUnavailable": "پیش‌نمایش در دسترس نیست",

  // کتابخانه رسانه (app/[locale]/(admin)/admin/media و components/admin/media/*)
} as const;
