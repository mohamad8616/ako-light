import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackLink } from "@/components/admin/catalog/BackLink";
import { FulfillmentStatusForm } from "@/components/admin/catalog/orders/FulfillmentStatusForm";
import { Badge } from "@/components/ui/badge";
import { pick } from "@/lib/i18n/localized";
import { formatToman } from "@/lib/i18n/price";
import { isLocale, type Locale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
import { getOrderAdminDetail } from "@/lib/repositories/orders";
import { notFound } from "next/navigation";

/**
 * Order detail — the read-only record plus the ONE editable control.
 *
 * Read-only by design: customer info, shipping address and line items come from
 * the OrderItem SNAPSHOT (name/image/unitPriceAtPurchase captured at checkout),
 * never from the live Product row, so the page keeps showing what the customer
 * actually bought even after a product is renamed, repriced or deleted.
 *
 * Payment status is rendered as a plain badge with an explicit read-only label.
 * It has no input, no action and no schema field anywhere in the admin — it is
 * written only by ZarinPal's `verify()` callback
 * (app/[locale]/(site)/checkout/callback/page.tsx). Only the fulfillment status
 * is editable, through its own server action.
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (id === "new") notFound();

  const detail = await getOrderAdminDetail(id);
  if (!detail) notFound();

  const dict = translations[locale];
  const lang: Locale = locale;
  const number = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US");
  const date = new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const paymentBadge: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    pending: { label: dict["admin.order.status.pending"], variant: "outline" },
    paid: { label: dict["admin.order.status.paid"], variant: "default" },
    failed: {
      label: dict["admin.order.status.failed"],
      variant: "destructive",
    },
    cancelled: {
      label: dict["admin.order.status.cancelled"],
      variant: "secondary",
    },
  };
  const payment = paymentBadge[detail.status] ?? {
    label: detail.status,
    variant: "outline" as const,
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:px-8">
        <AdminPageHeader
          locale={locale}
          titleKey="admin.order.detail.title"
          descriptionKey="admin.section.orders.description"
          actions={
            <BackLink
              href="/admin/orders"
              label={`${dict["admin.crud.back"]} — ${dict["admin.nav.orders"]}`}
            />
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer + shipping + payment */}
          <section className="border-border bg-card space-y-5 rounded-xl border p-5 shadow-sm sm:p-6">
            <h3 className="text-foreground text-sm font-semibold">
              {dict["admin.order.card.customer"]}
            </h3>
            <dl className="space-y-3 text-sm">
              <DetailRow label={dict["admin.order.field.customerName"]}>
                {detail.userName}
              </DetailRow>
              <DetailRow label={dict["admin.order.field.email"]}>
                <span dir="ltr">{detail.userEmail}</span>
              </DetailRow>
              <DetailRow label={dict["admin.order.field.orderId"]}>
                <span dir="ltr" className="font-mono text-xs break-all">
                  {detail.id}
                </span>
              </DetailRow>
              <DetailRow label={dict["admin.order.field.placedAt"]}>
                {date.format(new Date(detail.createdAt))}
              </DetailRow>
              <DetailRow label={dict["admin.order.field.updatedAt"]}>
                {date.format(new Date(detail.updatedAt))}
              </DetailRow>
            </dl>
          </section>

          <section className="border-border bg-card space-y-5 rounded-xl border p-5 shadow-sm sm:p-6">
            <h3 className="text-foreground text-sm font-semibold">
              {dict["admin.order.card.shipping"]}
            </h3>
            <dl className="space-y-3 text-sm">
              <DetailRow label={dict["admin.order.field.recipient"]}>
                {detail.recipientName}
              </DetailRow>
              <DetailRow label={dict["admin.order.field.phone"]}>
                <span dir="ltr">{detail.phone}</span>
              </DetailRow>
              <DetailRow label={dict["admin.order.field.address"]}>
                {detail.addressLine}
              </DetailRow>
              <DetailRow label={dict["admin.order.field.city"]}>
                {detail.city}
              </DetailRow>
              <DetailRow label={dict["admin.order.field.postalCode"]}>
                <span dir="ltr">{detail.postalCode}</span>
              </DetailRow>
            </dl>
          </section>

          {/* Payment — read-only, clearly labelled as such */}
          <section className="border-border bg-card space-y-5 rounded-xl border p-5 shadow-sm sm:p-6">
            <h3 className="text-foreground text-sm font-semibold">
              {dict["admin.order.card.payment"]}
            </h3>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={payment.variant}>{payment.label}</Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="text-xs">
                    {dict["admin.order.payment.readonlyShort"]}
                  </span>
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                {dict["admin.order.payment.readonly"]}
              </p>
              <dl className="space-y-3 text-sm">
                <DetailRow label={dict["admin.order.field.authority"]}>
                  <span dir="ltr" className="font-mono text-xs break-all">
                    {detail.zarinpalAuthority ?? "—"}
                  </span>
                </DetailRow>
                <DetailRow label={dict["admin.order.field.refId"]}>
                  <span dir="ltr" className="font-mono text-xs break-all">
                    {detail.zarinpalRefId ?? "—"}
                  </span>
                </DetailRow>
              </dl>
            </div>
          </section>
        </div>

        {/* Line items — OrderItem snapshot data, never live product data */}
        <section className="border-border bg-card space-y-5 rounded-xl border p-5 shadow-sm sm:p-6">
          <h3 className="text-foreground text-sm font-semibold">
            {dict["admin.order.card.items"]}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-xs">
                  <th className="py-2 text-start font-medium">
                    {dict["admin.table.col.name"]}
                  </th>
                  <th className="py-2 text-end font-medium">
                    {dict["admin.order.item.quantity"]}
                  </th>
                  <th className="py-2 text-end font-medium">
                    {dict["admin.order.item.unitPrice"]}
                  </th>
                  <th className="py-2 text-end font-medium">
                    {dict["admin.order.item.lineTotal"]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id} className="border-border/60 border-b">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          className="border-border size-10 shrink-0 rounded-md border object-cover"
                        />
                        <span className="text-foreground font-medium">
                          {pick(item.name, lang)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-end tabular-nums">
                      {number.format(item.quantity)}
                    </td>
                    <td className="py-3 text-end tabular-nums" dir="ltr">
                      {number.format(item.unitPriceAtPurchase)}
                    </td>
                    <td
                      className="py-3 text-end font-medium tabular-nums"
                      dir="ltr"
                    >
                      {number.format(item.unitPriceAtPurchase * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={3}
                    className="text-foreground py-3 text-end text-sm font-semibold"
                  >
                    {dict["admin.order.total"]}
                  </td>
                  <td
                    className="text-foreground py-3 text-end text-sm font-semibold tabular-nums"
                    dir="ltr"
                  >
                    {lang === "fa"
                      ? formatToman(detail.totalAmount)
                      : number.format(detail.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* The one editable control */}
        <FulfillmentStatusForm
          orderId={detail.id}
          fulfillmentStatus={detail.fulfillmentStatus}
        />
      </div>
    </div>
  );
}

/** One label/value pair in a detail card. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
