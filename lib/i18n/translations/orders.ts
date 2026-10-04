// Order history + order detail translations (en/fa).
// Pure data module - do not import components.
export const ordersEn = {
  "orders.title": "Your orders",
  "orders.subtitle": "Everything you have ordered from Home Form.",
  "orders.empty": "You have not placed any orders yet.",
  "orders.emptyHint":
    "Once you complete a purchase it will appear here with its status and details.",
  "orders.browse": "Browse products",

  "orders.orderNumber": "Order",
  "orders.placedOn": "Placed on",
  "orders.total": "Total",
  "orders.itemCount": "{count} item",
  "orders.itemCountPlural": "{count} items",
  "orders.viewDetails": "View details",
  "orders.backToOrders": "Back to your orders",

  "orders.notFound": "We could not find that order.",
  "orders.notFoundHint":
    "It may have been removed, or the link may belong to a different account.",

  "orders.signIn.title": "Sign in to see your orders",
  "orders.signIn.hint": "Your order history is private to your account.",
  "orders.signIn.cta": "Sign in",

  // Order detail sections
  "orders.section.items": "Items",
  "orders.section.shipping": "Shipping details",
  "orders.section.progress": "Progress",
  "orders.section.summary": "Summary",

  // Line items — all values come from the order's stored snapshot.
  "orders.col.product": "Product",
  "orders.col.quantity": "Quantity",
  "orders.col.unitPrice": "Unit price",
  "orders.col.lineTotal": "Line total",
  "orders.productRemoved": "This product is no longer available.",

  // Shipping
  "orders.shipping.recipientName": "Recipient",
  "orders.shipping.phone": "Phone",
  "orders.shipping.addressLine": "Address",
  "orders.shipping.city": "City",
  "orders.shipping.postalCode": "Postal code",

  // Payment status (Order.status) — written only by the payment gateway.
  "orders.payment.pending": "Awaiting payment",
  "orders.payment.paid": "Paid",
  "orders.payment.failed": "Payment failed",
  "orders.payment.cancelled": "Cancelled",

  // Fulfillment status (Order.fulfillmentStatus) — the shop's progress.
  "orders.fulfillment.unfulfilled": "Not yet prepared",
  "orders.fulfillment.processing": "Being prepared",
  "orders.fulfillment.shipped": "Shipped",
  "orders.fulfillment.delivered": "Delivered",
  "orders.fulfillment.cancelled": "Cancelled",

  // Progress steps. Derived from the CURRENT state — these carry no timestamps,
  // because the schema stores no status-change history (see lib/orders/lifecycle.ts).
  "orders.timeline.placed": "Order placed",
  "orders.timeline.paid": "Payment",
  "orders.timeline.processing": "Processing",
  "orders.timeline.shipped": "Shipped",
  "orders.timeline.delivered": "Delivered",
} as const;

export const ordersFa = {
  "orders.title": "سفارش‌های شما",
  "orders.subtitle": "همه سفارش‌های شما از Home Form.",
  "orders.empty": "هنوز سفارشی ثبت نکرده‌اید.",
  "orders.emptyHint":
    "پس از تکمیل خرید، سفارش شما با وضعیت و جزئیات در این صفحه نمایش داده می‌شود.",
  "orders.browse": "مشاهده محصولات",

  "orders.orderNumber": "سفارش",
  "orders.placedOn": "تاریخ ثبت",
  "orders.total": "مبلغ کل",
  "orders.itemCount": "{count} کالا",
  "orders.itemCountPlural": "{count} کالا",
  "orders.viewDetails": "مشاهده جزئیات",
  "orders.backToOrders": "بازگشت به سفارش‌ها",

  "orders.notFound": "این سفارش پیدا نشد.",
  "orders.notFoundHint":
    "ممکن است حذف شده باشد یا این نشانی متعلق به حساب دیگری باشد.",

  "orders.signIn.title": "برای مشاهده سفارش‌ها وارد شوید",
  "orders.signIn.hint": "تاریخچه سفارش‌های شما خصوصی است.",
  "orders.signIn.cta": "ورود",

  "orders.section.items": "اقلام",
  "orders.section.shipping": "اطلاعات ارسال",
  "orders.section.progress": "روند سفارش",
  "orders.section.summary": "خلاصه",

  "orders.col.product": "محصول",
  "orders.col.quantity": "تعداد",
  "orders.col.unitPrice": "قیمت واحد",
  "orders.col.lineTotal": "جمع",
  "orders.productRemoved": "این محصول دیگر موجود نیست.",

  "orders.shipping.recipientName": "گیرنده",
  "orders.shipping.phone": "تلفن",
  "orders.shipping.addressLine": "نشانی",
  "orders.shipping.city": "شهر",
  "orders.shipping.postalCode": "کد پستی",

  "orders.payment.pending": "در انتظار پرداخت",
  "orders.payment.paid": "پرداخت‌شده",
  "orders.payment.failed": "پرداخت ناموفق",
  "orders.payment.cancelled": "لغو شده",

  "orders.fulfillment.unfulfilled": "آماده‌سازی‌نشده",
  "orders.fulfillment.processing": "در حال آماده‌سازی",
  "orders.fulfillment.shipped": "ارسال‌شده",
  "orders.fulfillment.delivered": "تحویل‌داده‌شده",
  "orders.fulfillment.cancelled": "لغو شده",

  "orders.timeline.placed": "ثبت سفارش",
  "orders.timeline.paid": "پرداخت",
  "orders.timeline.processing": "آماده‌سازی",
  "orders.timeline.shipped": "ارسال",
  "orders.timeline.delivered": "تحویل",
} as const;
