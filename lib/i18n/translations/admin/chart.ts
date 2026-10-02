/**
 * Admin-only translations — the `admin.chart.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const chartEn = {
  "admin.chart.title": "Orders",
  "admin.chart.description.long": "Orders placed over the last 3 months",
  "admin.chart.description.short": "Last 3 months",
  "admin.chart.empty": "No orders in this period yet.",
  "admin.chart.select.aria": "Select a range",
  "admin.chart.range.90d": "Last 3 months",
  "admin.chart.range.30d": "Last 30 days",
  "admin.chart.range.7d": "Last 7 days",
  // Orders table
} as const;

export const chartFa = {
  "admin.chart.title": "سفارش‌ها",
  "admin.chart.description.long": "سفارش‌های ثبت‌شده در ۳ ماه گذشته",
  "admin.chart.description.short": "۳ ماه گذشته",
  "admin.chart.empty": "در این بازه هنوز سفارشی ثبت نشده است.",
  "admin.chart.select.aria": "انتخاب بازه زمانی",
  "admin.chart.range.90d": "۳ ماه گذشته",
  "admin.chart.range.30d": "۳۰ روز گذشته",
  "admin.chart.range.7d": "۷ روز گذشته",
  // Orders table
} as const;
