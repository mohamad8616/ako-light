/**
 * Admin-only translations — the `admin.error.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const errorEn = {
  "admin.error.unknown": "Something went wrong.",
  // Flagships & projects (dedicated-route sections)
  "admin.error.invalid": "Invalid value.",
  "admin.error.invalidLink":
    "Enter a full web address starting with https://, or a path on this site starting with /.",
  // A localized field with only one language filled (Pass D.1). Says what to DO,
  // because the alternative — "Invalid value." under the other input — is what
  // made a blocked Save look like a broken button.
  "admin.error.localizedPair":
    "Fill in both languages, or leave both empty to keep the built-in text.",
  "admin.error.required": "This field is required.",
  "admin.error.tooLong": "This value is too long.",
  // Upload-specific codes (lib/admin/actions/upload.ts).
  "admin.error.tooLarge": "This file is too large (max 5 MB).",
  "admin.error.notImage": "The file is not a supported image.",
  "admin.error.unsupportedType": "This file type is not supported.",
  "admin.error.slugTaken": "This handle is already in use.",
  "admin.error.notFound": "The item was not found.",
  "admin.error.invalidTransition":
    "That fulfillment change is not allowed for this order's current state.",
  "admin.error.inUse":
    "This media item is currently in use and cannot be deleted.",
  "admin.error.relationViolation": "A linked item is missing.",
  "admin.error.selfTarget": "You cannot change your own role or status.",

  // Password change (Pass C.2 — app/[locale]/(admin)/admin/profile)
  "admin.error.tooShort": "This password is too short (minimum 12 characters).",
  "admin.error.passwordMismatch": "The two passwords do not match.",
  "admin.error.wrongPassword": "Your current password is incorrect.",
  "admin.error.sameAsCurrent":
    "The new password must be different from your current one.",

  // Owner-only user management (app/[locale]/(admin)/admin/admins)
} as const;

export const errorFa = {
  "admin.error.unknown": "مشکلی پیش آمد.",
  // فلگ‌شپ‌ها و پروژه‌ها (بخش‌های دارای مسیر اختصاصی)
  "admin.error.invalid": "مقدار نامعتبر است.",
  "admin.error.invalidLink":
    "یک نشانی کامل که با https:// شروع شود وارد کنید، یا مسیری از همین سایت که با / شروع شود.",
  "admin.error.localizedPair":
    "هر دو زبان را پر کنید، یا هر دو را خالی بگذارید تا متن پیش‌فرض باقی بماند.",
  "admin.error.required": "این فیلد الزامی است.",
  "admin.error.tooLong": "این مقدار بیش از حد طولانی است.",
  // کدهای مخصوص آپلود (lib/admin/actions/upload.ts)
  "admin.error.tooLarge": "این فایل بسیار بزرگ است (حداکثر ۵ مگابایت).",
  "admin.error.notImage": "این فایل یک تصویر پشتیبانی‌شده نیست.",
  "admin.error.unsupportedType": "این نوع فایل پشتیبانی نمی‌شود.",
  "admin.error.slugTaken": "این شناسه قبلاً استفاده شده است.",
  "admin.error.notFound": "موردی یافت نشد.",
  "admin.error.invalidTransition":
    "این تغییر وضعیت برای سفارش در وضعیت فعلی مجاز نیست.",
  "admin.error.inUse":
    "این رسانه در حال استفاده است و حذف نمی‌شود.",
  "admin.error.relationViolation": "یک مورد مرتبط یافت نشد.",
  "admin.error.selfTarget":
    "نمی‌توانید نقش یا وضعیت حساب خودتان را تغییر دهید.",

  // تغییر گذرواژه (Pass C.2 — app/[locale]/(admin)/admin/profile)
  "admin.error.tooShort": "این گذرواژه کوتاه است (حداقل ۱۲ نویسه).",
  "admin.error.passwordMismatch": "دو گذرواژه یکسان نیستند.",
  "admin.error.wrongPassword": "گذرواژه فعلی شما نادرست است.",
  "admin.error.sameAsCurrent": "گذرواژه جدید باید با گذرواژه فعلی متفاوت باشد.",

  // مدیریت کاربران مخصوص مالک (app/[locale]/(admin)/admin/admins)
} as const;
