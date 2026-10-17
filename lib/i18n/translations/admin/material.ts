/**
 * Admin-only translations — the `admin.material.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const materialEn = {
  "admin.material.field.category": "Category",
  "admin.material.field.type": "Type",
  "admin.material.field.description": "Description",
  "admin.material.field.itemCount": "Material items",
  "admin.material.field.readiness": "Public visibility",
  "admin.material.ready": "Ready",
  "admin.material.incomplete": "Needs image and both names",
  "admin.material.categoryInUse": "Reassign or remove its items before deleting this group.",

} as const;

export const materialFa = {
  "admin.material.field.category": "دسته‌بندی",
  "admin.material.field.type": "نوع",
  "admin.material.field.description": "توضیحات",
  "admin.material.field.itemCount": "آیتم‌های متریال",
  "admin.material.field.readiness": "نمایش عمومی",
  "admin.material.ready": "آماده نمایش",
  "admin.material.incomplete": "تصویر و نام هر دو زبان لازم است",
  "admin.material.categoryInUse": "پیش از حذف این گروه، آیتم‌های آن را جابه‌جا یا حذف کنید.",

} as const;
