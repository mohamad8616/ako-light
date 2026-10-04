import {
  OrderStatusBadge,
  fulfillmentStatusTone,
  paymentStatusTone,
} from "@/components/orders/OrderStatusBadge";
import { auth } from "@/lib/auth/auth";
import { formatToman } from "@/lib/i18n/price";
import { getLocalizedPath, isLocale, type Locale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import {
  fulfillmentStatusLabel,
  paymentStatusLabel,
} from "@/lib/orders/labels";
import { getMyOrders, type CustomerOrderSummary } from "@/lib/repositories/orders";
import { buildLocalizedMetadata } from "@/lib/seo/metadata";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * The customer's order history.
 *
 * Lives in the (site) group, so the URL is `/orders` in English (the default
 * locale) and `/fa/orders` in Persian — the proxy rewrites the unprefixed path
 * into the `en` tree, exactly like every other public route. There is no
 * `/en/orders`.
 *
 * A React Server Component: it reads the session, queries with the session's
 * user id, and renders. No client JavaScript is needed for the list itself, and
 * no client-supplied id is involved anywhere — `getMyOrders` scopes the query by
 * the authenticated user.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang: Locale = isLocale(locale) ? locale : "en";
  const t = translations[lang];

  return buildLocalizedMetadata({
    locale,
    path: "/orders",
    title: t["orders.title"],
    description: t["orders.subtitle"],
    // A private, per-account page must never be indexed.
    noindex: true,
  });
}

/** `fa` renders Persian digits and the Jalali calendar; `en` stays Gregorian. */
function formatPlacedOn(iso: string, lang: Locale): string {
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

function OrderCard({
  order,
  lang,
  t,
}: {
  order: CustomerOrderSummary;
  lang: Locale;
  t: Record<string, string>;
}) {
  const countKey =
    order.itemCount === 1 ? "orders.itemCount" : "orders.itemCountPlural";

  return (
    <li className="border border-stone-200 bg-white">
      <Link
        href={getLocalizedPath(`/orders/${order.id}`, lang)}
        className="flex flex-col gap-5 p-5 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-stone-100">
          {order.previewImage ? (
            <Image
              src={order.previewImage}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs break-all text-stone-500">
            {t["orders.orderNumber"]} {order.id}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {t["orders.placedOn"]} {formatPlacedOn(order.createdAt, lang)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <OrderStatusBadge
              tone={paymentStatusTone(order.status)}
              label={paymentStatusLabel(t, order.status)}
            />
            <OrderStatusBadge
              tone={fulfillmentStatusTone(order.fulfillmentStatus)}
              label={fulfillmentStatusLabel(t, order.fulfillmentStatus)}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <span className="text-base font-medium text-stone-950">
            {formatToman(order.totalAmount)}
          </span>
          <span className="text-xs text-stone-500">
            {t[countKey].replace("{count}", String(order.itemCount))}
          </span>
          <span className="mt-2 text-xs tracking-[0.15em] text-stone-950 uppercase">
            {t["orders.viewDetails"]}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = translations[locale];

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    // Keeps the visitor in their own language tree, and returns them here
    // afterwards.
    const callback = getLocalizedPath("/orders", locale);
    redirect(
      `${getLocalizedPath("/sign-in", locale)}?redirectTo=${encodeURIComponent(callback)}`,
    );
  }

  const orders = await getMyOrders(session.user.id);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-32 text-stone-950 md:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
          {t["orders.title"]}
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight md:text-5xl">
          {t["orders.title"]}
        </h1>
        <p className="mt-3 text-sm text-stone-600">{t["orders.subtitle"]}</p>

        {orders.length === 0 ? (
          <div className="mt-12 border border-stone-200 bg-white p-8 text-center">
            <p className="text-base font-medium text-stone-950">
              {t["orders.empty"]}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
              {t["orders.emptyHint"]}
            </p>
            <Link
              href={getLocalizedPath("/products", locale)}
              className="mt-6 inline-block bg-stone-950 px-8 py-3 text-sm font-medium text-white uppercase transition-colors hover:bg-stone-800"
            >
              {t["orders.browse"]}
            </Link>
          </div>
        ) : (
          <ul className="mt-12 flex flex-col gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} lang={locale} t={t} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
