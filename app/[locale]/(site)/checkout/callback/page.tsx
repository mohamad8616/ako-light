import PaymentCallbackState from "@/components/checkout/PaymentCallbackState";
import { auth } from "@/lib/auth/auth";
import { signalCartReset } from "@/lib/cart/reset-signal";
import { prisma } from "@/lib/db/prisma";
import { formatToman } from "@/lib/i18n/price";
import { isLocale } from "@/lib/i18n/routing";
import { sendOrderReceipt } from "@/lib/notifications/order-receipt";
import { authorizeOrderAccess } from "@/lib/orders/access-token";
import { verify, ZarinPalError } from "@/lib/payments/zarinpal";
import { claimPendingOrder } from "@/lib/repositories/orders";
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
    // The customer came back from the gateway WITHOUT a success status ("NOK",
    // or no Authority at all) — ZarinPal is telling us this payment did not
    // happen. That is a verdict about the payment, so recording it failed is
    // correct, and the guarded claim releases the stock this order reserved
    // (see claimPendingOrder). It will not downgrade an order that another
    // callback has already settled as paid.
    await claimPendingOrder({
      orderId: order.id,
      status: "failed",
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
  // Set only when we have NO verdict on the payment — see the catch below.
  let couldNotConfirm = false;

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

    // A verified payment is the one transition that must never be lost, so the
    // order is claimed with a single guarded UPDATE rather than a plain write:
    //   - `pending` → this callback is the first to settle it;
    //   - `paid`    → a re-visit re-verifies harmlessly (the receipt guard
    //                 below stops a duplicate);
    //   - `failed`  → ZarinPal has now confirmed payment, so a previously
    //                 mis-recorded failure is CORRECTED to paid. This is what
    //                 un-does the damage the old catch block caused.
    // `claimPendingOrder` also releases the stock reservation on a
    // pending → failed transition (see lib/repositories/orders.ts).
    await claimPendingOrder({
      orderId: order.id,
      status: refId ? "paid" : "failed",
      zarinpalRefId: refId,
    });

    // The payment is now durably recorded, so record the "empty the cart"
    // signal server-side. Doing it HERE rather than only through the client
    // component is what makes the reset survive a callback that renders early,
    // an un-hydrated page, a closed tab, or a return visit days later — see
    // lib/cart/reset-signal.ts. It is set only on a real payment, so a failed
    // order can never clear a cart the customer still needs.
    if (refId) {
      await signalCartReset(order.id);
    }

    // The receipt is sent only now that the payment is durably recorded, and
    // only on the first transition to paid. `sendOrderReceipt` never throws, so
    // a notification failure cannot turn a successful payment into an error
    // page for the customer.
    if (refId && !alreadyPaid) {
      await sendOrderReceipt(order.id);
    }
  } catch (error) {
    // THE BUG THIS BLOCK EXISTS TO PREVENT: this used to unconditionally write
    // `status: "failed"`. When ZARINPAL_MERCHANT_ID was missing or malformed,
    // ZarinPal rejected every call with `code: 0`, so a genuinely PAID order
    // was recorded as failed — for every customer, silently, with the customer
    // told to retry (and able to pay twice).
    //
    // A gateway fault means we have NO VERDICT on this payment. The only safe
    // actions are: leave the order recoverable, say so plainly, and do NOT
    // invite a retry. The order stays `pending`, which is honest — and because
    // ZarinPal has already taken the money in the common case, a later
    // re-visit of this callback (or reconciliation) can still settle it to
    // `paid`, which a `failed` status would have made impossible to distinguish
    // from a genuine decline.
    if (error instanceof ZarinPalError && error.isGatewayFault) {
      couldNotConfirm = true;

      // Logged loudly, naming the variable family rather than any value, so an
      // operator can find this in production logs without a database query.
      console.error(
        `[checkout] Gateway fault while verifying order ${order.id}: ${error.message} ` +
          `Order left "${order.status}" so it can still be reconciled to paid.`,
      );
    } else {
      // ZarinPal answered about THIS payment and the answer was no (or an
      // unexpected non-gateway error). Recording it failed is correct, and the
      // guarded claim keeps the transition one-way — it will not overwrite an
      // order that another concurrent callback has already settled as paid.
      await claimPendingOrder({
        orderId: order.id,
        status: "failed",
      });

      verifyErrorMessage =
        error instanceof Error
          ? error.message
          : "We could not verify the payment with ZarinPal.";
    }
  }

  if (couldNotConfirm) {
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">We could not confirm your payment</h1>
        <p className="mt-4 text-stone-600">
          Your payment may have gone through, but we were unable to confirm it
          with the payment gateway, so this order is still recorded as awaiting
          payment. Please do not pay again — contact us with your order number
          and we will confirm it.
        </p>
        <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Order ID: <span className="font-mono break-all">{order.id}</span>
        </div>
      </main>
    );
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
      <PaymentCallbackState success={Boolean(refId)} orderId={order.id} />
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
