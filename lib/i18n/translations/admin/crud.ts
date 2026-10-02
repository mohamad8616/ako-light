/**
 * Admin-only translations — the `admin.crud.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const crudEn = {
  "admin.crud.new": "New",
  "admin.crud.back": "Back",
  "admin.crud.view": "View",
  "admin.crud.created": "Created",
  "admin.crud.deleted": "Deleted",
  "admin.crud.deleteTitle": "Delete item",
  "admin.crud.deleteDescription": "This item will be permanently removed.",
  "admin.crud.cancel": "Cancel",
  "admin.crud.save": "Save",
  "admin.crud.optional": "Optional",
  "admin.crud.moveUp": "Move up",
  "admin.crud.moveDown": "Move down",
  "admin.crud.remove": "Remove",
  "admin.crud.add": "Add",
  "admin.crud.alt": "Alt text",
  "admin.crud.primary": "Primary",
  "admin.crud.asPlain": "Plain",
  "admin.crud.asLocalized": "Localized",
  "admin.crud.slugHint": "Use lowercase letters and dashes.",
  "admin.crud.slugRegenerate": "Regenerate slug",
  "admin.crud.slugWarning": "Changing the slug can affect existing links.",
  "admin.crud.deleteCascadeCount":
    "This will also remove {count} related items.",

  // Image upload (components/admin/ImageUpload.tsx + actions/upload.ts)
} as const;

export const crudFa = {
  "admin.crud.new": "جدید",
  "admin.crud.back": "بازگشت",
  "admin.crud.view": "مشاهده",
  "admin.crud.created": "ایجاد شد",
  "admin.crud.deleted": "حذف شد",
  "admin.crud.deleteTitle": "حذف مورد",
  "admin.crud.deleteDescription": "این مورد برای همیشه حذف خواهد شد.",
  "admin.crud.cancel": "انصراف",
  "admin.crud.save": "ذخیره",
  "admin.crud.optional": "اختیاری",
  "admin.crud.moveUp": "انتقال به بالا",
  "admin.crud.moveDown": "انتقال به پایین",
  "admin.crud.remove": "حذف",
  "admin.crud.add": "افزودن",
  "admin.crud.alt": "متن جایگزین",
  "admin.crud.primary": "اصلی",
  "admin.crud.asPlain": "خام",
  "admin.crud.asLocalized": "محلی‌سازی‌شده",
  "admin.crud.slugHint": "از حروف کوچک و خط تیره استفاده کنید.",
  "admin.crud.slugRegenerate": "تولید مجدد اسلاگ",
  "admin.crud.slugWarning":
    "تغییر اسلاگ می‌تواند روی لینک‌های موجود تأثیر بگذارد.",
  "admin.crud.deleteCascadeCount":
    "با این کار {count} مورد مرتبط هم حذف می‌شود.",

  // آپلود تصویر (components/admin/ImageUpload.tsx و actions/upload.ts)
} as const;
