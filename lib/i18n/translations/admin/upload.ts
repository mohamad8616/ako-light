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

  // کتابخانه رسانه (app/[locale]/(admin)/admin/media و components/admin/media/*)
} as const;
