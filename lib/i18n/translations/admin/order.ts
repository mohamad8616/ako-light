/**
 * Admin-only translations — the `admin.order.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const orderEn = {
  "admin.order.col.customer": "Customer",
  "admin.order.col.total": "Total (Toman)",
  "admin.order.col.paymentStatus": "Payment status",
  "admin.order.col.fulfillmentStatus": "Fulfillment",
  "admin.order.col.date": "Date",
  "admin.order.status.pending": "Pending",
  "admin.order.status.paid": "Paid",
  "admin.order.status.failed": "Failed",
  "admin.order.status.cancelled": "Cancelled",
  "admin.order.fulfillment.unfulfilled": "Unfulfilled",
  "admin.order.fulfillment.processing": "Processing",
  "admin.order.fulfillment.shipped": "Shipped",
  "admin.order.fulfillment.delivered": "Delivered",
  "admin.order.fulfillment.cancelled": "Cancelled",
  // Order detail
  "admin.order.detail.title": "Order detail",
  "admin.order.card.customer": "Customer",
  "admin.order.card.shipping": "Shipping address",
  "admin.order.card.items": "Line items",
  "admin.order.card.payment": "Payment",
  "admin.order.card.fulfillment": "Fulfillment",
  "admin.order.field.recipient": "Recipient",
  "admin.order.field.customerName": "Name",
  "admin.order.field.phone": "Phone",
  "admin.order.field.address": "Address",
  "admin.order.field.city": "City",
  "admin.order.field.postalCode": "Postal code",
  "admin.order.field.email": "Email",
  "admin.order.field.orderId": "Order ID",
  "admin.order.field.placedAt": "Placed at",
  "admin.order.field.updatedAt": "Last updated",
  "admin.order.field.authority": "ZarinPal authority",
  "admin.order.field.refId": "ZarinPal reference ID",
  "admin.order.item.quantity": "Qty",
  "admin.order.item.unitPrice": "Unit price",
  "admin.order.item.lineTotal": "Line total",
  "admin.order.total": "Total",
  "admin.order.payment.readonly":
    "Read-only — payment status changes only through ZarinPal's verification callback and can never be edited here.",
  "admin.order.payment.readonlyShort": "Read-only",
  "admin.order.fulfillment.hint":
    "Update the fulfillment stage for this order. This does not affect payment.",
  "admin.order.fulfillment.updated": "Fulfillment status updated",
  "admin.order.notFound": "This order could not be found.",
  // Catalog entity forms and CRUD
} as const;

export const orderFa = {
  "admin.order.col.customer": "مشتری",
  "admin.order.col.total": "مجموع (تومان)",
  "admin.order.col.paymentStatus": "وضعیت پرداخت",
  "admin.order.col.fulfillmentStatus": "تکمیل",
  "admin.order.col.date": "تاریخ",
  "admin.order.status.pending": "در انتظار",
  "admin.order.status.paid": "پرداخت‌شده",
  "admin.order.status.failed": "ناموفق",
  "admin.order.status.cancelled": "لغو شده",
  "admin.order.fulfillment.unfulfilled": "تکمیل‌نشده",
  "admin.order.fulfillment.processing": "در حال آماده‌سازی",
  "admin.order.fulfillment.shipped": "ارسال‌شده",
  "admin.order.fulfillment.delivered": "تحویل‌داده‌شده",
  "admin.order.fulfillment.cancelled": "لغو شده",
  // جزئیات سفارش
  "admin.order.detail.title": "جزئیات سفارش",
  "admin.order.card.customer": "مشتری",
  "admin.order.card.shipping": "آدرس ارسال",
  "admin.order.card.items": "اقلام سفارش",
  "admin.order.card.payment": "پرداخت",
  "admin.order.card.fulfillment": "تکمیل سفارش",
  "admin.order.field.recipient": "گیرنده",
  "admin.order.field.customerName": "نام",
  "admin.order.field.phone": "تلفن",
  "admin.order.field.address": "نشانی",
  "admin.order.field.city": "شهر",
  "admin.order.field.postalCode": "کد پستی",
  "admin.order.field.email": "ایمیل",
  "admin.order.field.orderId": "شناسه سفارش",
  "admin.order.field.placedAt": "زمان ثبت",
  "admin.order.field.updatedAt": "آخرین به‌روزرسانی",
  "admin.order.field.authority": "شناسه Authority زرین‌پال",
  "admin.order.field.refId": "شناسه پیگیری زرین‌پال",
  "admin.order.item.quantity": "تعداد",
  "admin.order.item.unitPrice": "قیمت واحد",
  "admin.order.item.lineTotal": "جمع ردیف",
  "admin.order.total": "مجموع",
  "admin.order.payment.readonly":
    "فقط‌خواندنی — وضعیت پرداخت تنها از طریق بازگشت تأیید زرین‌پال تغییر می‌کند و هرگز از اینجا قابل ویرایش نیست.",
  "admin.order.payment.readonlyShort": "فقط‌خواندنی",
  "admin.order.fulfillment.hint":
    "مرحله تکمیل این سفارش را به‌روزرسانی کنید. این کار روی وضعیت پرداخت تأثیری ندارد.",
  "admin.order.fulfillment.updated": "وضعیت تکمیل به‌روزرسانی شد",
  "admin.order.notFound": "این سفارش یافت نشد.",
  // فرم‌ها و عملیات کاتالوگ
} as const;
