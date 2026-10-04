import {
  OrderStatusBadge,
  fulfillmentStatusTone,
  paymentStatusTone,
} from "@/components/orders/OrderStatusBadge";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { auth } from "@/lib/auth/auth";
import { pick } from "@/lib/i18n/localized";
import { formatToman } from "@/lib/i18n/price";
import { getLocalizedPath, isLocale, type Locale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import {
  fulfillmentStatusLabel,
  paymentStatusLabel,
} from "@/lib/orders/labels";
import { getMyOrder } from "@/lib/repositories/orders";
import type { FulfillmentStatus, OrderPaymentStatus } from "@/lib/orders/lifecycle";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * One order, for its owner.
 *
 * The id comes from the URL, but OWNERSHIP DOES NOT: `getMyOrder(userId, id)`
 * puts the session's user id in the WHERE clause, so another account's order
 * matches no row and this page renders `notFound()`. The same response is
 * returned for "no such order", so a visitor cannot use this page to discover
 * whether someone else's order id exists.
 *
 * Every product name, image and price below comes from the ORDER SNAPSHOT
 * (`OrderItem.name` / `.image` / `.unitPriceAtPurchase`), never from the current
 * Product row — a product renamed, re-priced or deleted after purchase must not
 * rewrite history. `productSlug` is the one live value, and it is only used to
 * offer a link; it is null once the product is gone.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang: Locale = isLocale(locale) ? locale : "en";
  const t = translations[lang];

  return buildLocalizedMetadata({
    locale,
    // The metadata path stays locale-neutral; the id is not part of the title.
    path: "/orders",
    title: t["orders.orderNumber"],
    description: t["orders.subtitle"],
    noindex: true,
  });
}

/** `fa` renders Persian digits and the Jalali calendar; `en` stays Gregorian. */
function formatDate(iso: string, lang: Locale): string {
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  if (!isLocale(locale)) notFound();
  const t = translations[locale];

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const callback = getLocalizedPath(`/orders/${orderId}`, locale);
    redirect(
      `${getLocalizedPath("/sign-in", locale)}?redirectTo=${encodeURIComponent(callback)}`,
    );
  }

  const order = await getMyOrder(session.user.id, orderId);
  // Covers both "does not exist" and "belongs to someone else" — the two are
  // deliberately indistinguishable from out here.
  if (!order) notFound();

  const stopped =
    order.status === "failed" || order.status === "cancelled"
      ? paymentStatusLabel(t, order.status)
      : order.fulfillmentStatus === "cancelled"
        ? (t["orders.fulfillment.cancelled"] ?? "Cancelled")
        : null;

  const timelineLabels = {
    placed: t["orders.timeline.placed"],
    paid: t["orders.timeline.paid"],
    processing: t["orders.timeline.processing"],
    shipped: t["orders.timeline.shipped"],
    delivered: t["orders.timeline.delivered"],
  };

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-32 text-stone-950 md:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl">
        <Link
          href={getLocalizedPath("/orders", locale)}
          className="text-xs tracking-[0.2em] text-stone-500 uppercase transition-colors hover:text-stone-950"
        >
          {t["orders.backToOrders"]}
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
              {t["orders.orderNumber"]}
            </p>
            <h1 className="mt-2 font-mono text-lg break-all md:text-2xl">
              {order.id}
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              {t["orders.placedOn"]} {formatDate(order.createdAt, locale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge
              label={paymentStatusLabel(t, order.status)}
              tone={paymentStatusTone(order.status)}
            />
            <OrderStatusBadge
              label={fulfillmentStatusLabel(t, order.fulfillmentStatus)}
              tone={fulfillmentStatusTone(order.fulfillmentStatus)}
            />
          </div>
        </div>

        {/* Progress */}
        <section className="mt-12 border border-stone-200 bg-white p-6 sm:p-8">
          <h2 className="text-xs tracking-[0.2em] text-stone-500 uppercase">
            {t["orders.section.progress"]}
          </h2>
          <div className="mt-6">
            <OrderTimeline
              paymentStatus={order.status as OrderPaymentStatus}
              fulfillmentStatus={order.fulfillmentStatus as FulfillmentStatus}
              labels={timelineLabels}
              stoppedLabel={stopped}
            />
          </div>
        </section>

        {/* Items — every value is the stored snapshot. */}
        <section className="mt-8 border border-stone-200 bg-white">
          <h2 className="border-b border-stone-200 p-6 text-xs tracking-[0.2em] text-stone-500 uppercase sm:px-8">
            {t["orders.section.items"]}
          </h2>
          <ul className="divide-y divide-stone-200">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-6 sm:px-8"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-stone-100">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-950">
                    {pick(item.name, locale)}
                  </p>
                  {item.productSlug ? (
                    <Link
                      href={getLocalizedPath(
                        `/products/${item.productSlug}`,
                        locale,
                      )}
                      className="mt-1 inline-block text-xs text-stone-500 underline-offset-4 hover:text-stone-950 hover:underline"
                    >
                      {t["orders.viewDetails"]}
                    </Link>
                  ) : (
                    <p className="mt-1 text-xs text-stone-400">
                      {t["orders.productRemoved"]}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-stone-500">
                    {t["orders.col.quantity"]}: {item.quantity}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                  <span className="text-sm text-stone-600">
                    {formatToman(item.unitPriceAtPurchase)}
                  </span>
                  <span className="text-base font-medium text-stone-950">
                    {formatToman(item.lineTotal)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Shipping */}
          <section className="border border-stone-200 bg-white p-6 sm:p-8">
            <h2 className="text-xs tracking-[0.2em] text-stone-500 uppercase">
              {t["orders.section.shipping"]}
            </h2>
            <dl className="mt-6 flex flex-col gap-4 text-sm">
              <ShippingRow
                label={t["orders.shipping.recipientName"]}
                value={order.recipientName}
              />
              <ShippingRow
                label={t["orders.shipping.phone"]}
                value={order.phone}
              />
              <ShippingRow
                label={t["orders.shipping.addressLine"]}
                value={order.addressLine}
              />
              <ShippingRow label={t["orders.shipping.city"]} value={order.city} />
              <ShippingRow
                label={t["orders.shipping.postalCode"]}
                value={order.postalCode}
              />
            </dl>
          </section>

          {/* Summary */}
          <section className="border border-stone-200 bg-white p-6 sm:p-8">
            <h2 className="text-xs tracking-[0.2em] text-stone-500 uppercase">
              {t["orders.section.summary"]}
            </h2>
            <div className="mt-6 flex items-baseline justify-between border-t border-stone-200 pt-4">
              <span className="text-sm text-stone-600">
                {t["orders.total"]}
              </span>
              <span className="text-2xl font-medium text-stone-950">
                {formatToman(order.totalAmount)}
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ShippingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-stone-950">{value}</dd>
    </div>
  );
}
