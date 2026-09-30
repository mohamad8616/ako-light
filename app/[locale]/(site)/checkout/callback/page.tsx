import PaymentCallbackState from "@/components/checkout/PaymentCallbackState";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { formatToman } from "@/lib/i18n/price";
import { isLocale } from "@/lib/i18n/routing";
import { sendOrderReceipt } from "@/lib/notifications/order-receipt";
import { authorizeOrderAccess } from "@/lib/orders/access-token";
import { verify } from "@/lib/payments/zarinpal";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function CheckoutCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    orderId?: string | string[];
    Authority?: string | string[];
    Status?: string | string[];
    token?: string | string[];
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const orderId = typeof query.orderId === "string" ? query.orderId : undefined;
  const authority =
    typeof query.Authority === "string" ? query.Authority : undefined;
  const status = typeof query.Status === "string" ? query.Status : undefined;
  // A signed, single-order access token — the "opened from an SMS/email,
  // possibly signed out, possibly a different device" path. Never a session
  // substitute: it is only consulted for this page and only ever authorises
  // the one order it names.
  const token = typeof query.token === "string" ? query.token : undefined;

  if (!orderId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Payment failed</h1>
        <p className="mt-4 text-stone-600">
          The payment callback did not include an order reference.
        </p>
      </main>
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true,
      currency: true,
      totalAmount: true,
      zarinpalAuthority: true,
    },
  });

  // Two accepted paths, decided in one place (see lib/orders/access-token.ts):
  //   1. the signed-in owner of the order — the in-app path, unchanged;
  //   2. a valid signed token scoped to THIS order — no session required.
  // Everything else is refused. The token cannot name another order, is not a
  // session, and is never checked on any write/admin surface.
  const access = authorizeOrderAccess({
    order,
    session: session ? { userId: session.user.id } : null,
    token,
  });

  if (!order || !access) {
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Unable to verify order</h1>
        <p className="mt-4 text-stone-600">
          The referenced payment order could not be loaded for this session.
        </p>
      </main>
    );
  }

  if (status !== "OK" || !authority) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        zarinpalAuthority: authority ?? order.zarinpalAuthority,
        updatedAt: new Date(),
      },
    });

    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Payment was not completed</h1>
        <p className="mt-4 text-stone-600">
          The payment gateway returned a failed or cancelled result. You can
          retry the checkout.
        </p>
      </main>
    );
  }

  // Only the network + DB work is guarded. React does not render synchronously
  // with `return <JSX>`, so rendering must happen OUTSIDE the try/catch —
  // otherwise a rendering error would never be caught here anyway.
  let refId: string | null = null;
  let verifyErrorMessage: string | null = null;

  // Captured BEFORE the update so the receipt fires only on the real
  // pending/failed → paid transition. This page re-runs verification on every
  // visit, so without the guard a customer refreshing (or reopening the link
  // from their receipt) would be sent a second copy each time.
  const alreadyPaid = order.status === "paid";

  try {
    const result = await verify({
      authority,
      // Order.totalAmount is stored in Toman; verify converts x10 to Rial to
      // match the amount sent when the payment request was created.
      amountToman: Number(order.totalAmount.toString()),
    });

    refId = result.refId ?? null;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: refId ? "paid" : "failed",
        zarinpalAuthority: authority,
        zarinpalRefId: refId,
        updatedAt: new Date(),
      },
    });

    // The receipt is sent only now that the payment is durably recorded, and
    // only on the first transition to paid. `sendOrderReceipt` never throws, so
    // a notification failure cannot turn a successful payment into an error
    // page for the customer.
    if (refId && !alreadyPaid) {
      await sendOrderReceipt(order.id);
    }
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        zarinpalAuthority: authority,
        updatedAt: new Date(),
      },
    });

    verifyErrorMessage =
      error instanceof Error
        ? error.message
        : "We could not verify the payment with ZarinPal.";
  }

  if (verifyErrorMessage) {
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Payment verification failed</h1>
        <p className="mt-4 text-stone-600">{verifyErrorMessage}</p>
      </main>
    );
  }

  return (
    <>
      <PaymentCallbackState success={Boolean(refId)} />
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        {refId ? (
          <>
            <h1 className="text-3xl font-medium">Payment received</h1>
            <p className="mt-4 text-stone-600">
              Your order has been paid successfully.
            </p>
            <div className="mt-6 rounded border border-stone-200 bg-white p-4 text-sm text-stone-700">
              Order ID: <span className="font-mono break-all">{order.id}</span>
              <div className="mt-2">
                Amount paid:{" "}
                <span className="font-medium text-stone-950">
                  {formatOrderAmount(order.totalAmount, order.currency, locale)}
                </span>
              </div>
              <div className="mt-2">
                Reference ID:{" "}
                <span className="font-mono break-all">{refId}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-medium">Payment verification failed</h1>
            <p className="mt-4 text-stone-600">
              The payment was not verified by ZarinPal. Please retry checkout.
            </p>
          </>
        )}
      </main>
    </>
  );
}

/**
 * Renders an order's stored total for the confirmation page.
 *
 * Orders snapshot their amounts in Toman (see OrderItem.unitPriceAtPurchase).
 * The confirmation page shows the same Toman figure the customer saw throughout
 * checkout — not the Rial amount that was sent to ZarinPal.
 */
function formatOrderAmount(
  totalAmount: unknown,
  currency: string,
  locale: string,
): string {
  const total = Number(String(totalAmount));

  if (locale === "fa") {
    return formatToman(total);
  }

  return `${new Intl.NumberFormat("en-US").format(total)} ${currency}`;
}
