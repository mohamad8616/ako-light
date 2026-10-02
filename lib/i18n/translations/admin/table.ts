/**
 * Admin-only translations — the `admin.table.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const tableEn = {
  "admin.table.columns": "Columns",
  "admin.table.edit": "Edit",
  "admin.table.delete": "Delete",
  "admin.table.col.name": "Product",
  "admin.table.col.category": "Category",
  "admin.table.col.designer": "Designer",
  "admin.table.saving": "Saving",
  "admin.table.saved": "Saved",
  "admin.table.rowsSelected": "row(s) selected.",
  "admin.table.of": "of",
  "admin.table.rowsPerPage": "Rows per page",
  "admin.table.page": "Page",
  "admin.table.noResults": "No results.",
  "admin.table.goToFirstPage": "Go to first page",
  "admin.table.goToPreviousPage": "Go to previous page",
  "admin.table.goToNextPage": "Go to next page",
  "admin.table.goToLastPage": "Go to last page",

  // Chart (orders)
} as const;

export const tableFa = {
  "admin.table.columns": "ستون‌ها",
  "admin.table.edit": "ویرایش",
  "admin.table.delete": "حذف",
  "admin.table.col.name": "محصول",
  "admin.table.col.category": "دسته‌بندی",
  "admin.table.col.designer": "طراح",
  "admin.table.saving": "در حال ذخیره",
  "admin.table.saved": "ذخیره شد",
  "admin.table.rowsSelected": "ردیف انتخاب شده است.",
  "admin.table.of": "از",
  "admin.table.rowsPerPage": "ردیف در صفحه",
  "admin.table.page": "صفحه",
  "admin.table.noResults": "نتیجه‌ای یافت نشد.",
  "admin.table.goToFirstPage": "رفتن به صفحه اول",
  "admin.table.goToPreviousPage": "رفتن به صفحه قبل",
  "admin.table.goToNextPage": "رفتن به صفحه بعد",
  "admin.table.goToLastPage": "رفتن به صفحه آخر",

  // نمودار (سفارش‌ها)
} as const;
