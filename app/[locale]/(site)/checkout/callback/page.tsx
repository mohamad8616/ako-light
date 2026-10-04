import PaymentCallbackState from "@/components/checkout/PaymentCallbackState";
import { auth } from "@/lib/auth/auth";
import { signalCartReset } from "@/lib/cart/reset-signal";
import { prisma } from "@/lib/db/prisma";
import { formatToman } from "@/lib/i18n/price";
import { isLocale } from "@/lib/i18n/routing";
import { sendOrderReceipt } from "@/lib/notifications/order-receipt";
import { authorizeOrderAccess } from "@/lib/orders/access-token";
import {
  failPendingPayment,
  settlePayment,
  type SettlementOutcome,
} from "@/lib/payments/settlement";
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

  // The order is resolved FROM THE AUTHORITY, not from the query string. The
  // `?orderId=` param is a convenience/consistency hint only: it can never
  // select an order, and a mismatch between it and the authority's order is
  // refused outright (see settlePayment). Everything the settlement writes —
  // the expected amount above all — comes from the order row itself, so a
  // browser cannot influence what is verified or charged.
  const order = authority
    ? await prisma.order.findFirst({
        where: { zarinpalAuthority: authority },
        select: {
          id: true,
          status: true,
          userId: true,
          currency: true,
          totalAmount: true,
          zarinpalAuthority: true,
        },
      })
    : null;

  if (!order) {
    // No stored authority matches. We cannot know WHICH order was paid, so
    // nothing is read or written — not even for a signed-in visitor.
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Unable to verify order</h1>
        <p className="mt-4 text-stone-600">
          We could not match this payment to one of your orders. If you were
          charged, contact us with your order number and we will confirm it.
        </p>
      </main>
    );
  }

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

  if (!access) {
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
    // ZarinPal is telling us this payment did not happen, and it is the same
    // order the authority belongs to. `failPendingPayment` only ever moves
    // `pending → failed` and releases the reservation exactly once, so a
    // re-delivered non-success callback cannot double-release stock and cannot
    // downgrade an order another callback already settled as paid.
    await failPendingPayment(order.id);

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

  // Captured BEFORE the settle so the receipt fires only on the real
  // (pending|failed) → paid transition. This page re-runs verification on every
  // visit, so without the guard a customer refreshing (or reopening the link
  // from their receipt) would be sent a second copy each time.
  const alreadyPaid = order.status === "paid";

  // Verification and settlement are one guarded operation: verify with
  // ZarinPal using the STORED total, then make the status change and the stock
  // reconciliation commit together. A browser redirect is not proof of
  // payment — this call is.
  let outcome: SettlementOutcome;
  try {
    outcome = await settlePayment({
      authority,
      orderIdHint: orderId ?? null,
    });
  } catch (error) {
    // `settlePayment` is written not to throw, but a fault here must never
    // surface an internal message to the customer.
    console.error("[checkout] Unexpected settlement fault", {
      orderId: order.id,
      category: error instanceof Error ? error.name : "UnknownError",
    });
    outcome = { kind: "error", orderId: order.id };
  }

  if (outcome.kind === "paid") {
    const refId = outcome.refId;

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

    return (
      <>
        <PaymentCallbackState success orderId={order.id} />
        <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
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
            {refId ? (
              <div className="mt-2">
                Reference ID:{" "}
                <span className="font-mono break-all">{refId}</span>
              </div>
            ) : null}
          </div>
        </main>
      </>
    );
  }

  if (outcome.kind === "alreadyPaid") {
    // A re-delivered callback, a refresh, or a gateway retry. The order is
    // already settled, so there is nothing to write and no side effect to
    // repeat — but the customer must still see their success and order details.
    return (
      <>
        <PaymentCallbackState success orderId={order.id} />
        <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
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
          </div>
        </main>
      </>
    );
  }

  if (outcome.kind === "unconfirmed") {
    // NO VERDICT from ZarinPal. Leave the order recoverable, say so plainly,
    // and do NOT invite a retry — the customer may have already paid. Logged
    // with the order id only, never a credential or gateway payload.
    console.error(
      `[checkout] Gateway fault while verifying order ${order.id}. ` +
        `Order left "${order.status}" so it can still be reconciled to paid.`,
    );

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

  if (outcome.kind === "manualReview") {
    // A real successful payment on an order whose reservation was already
    // released and cannot be re-established. Marking it paid would sell stock
    // the shop does not hold, so the order stays failed and a human is asked to
    // resolve it. The customer is told the truth without being told to pay
    // again.
    console.error(
      `[checkout] Payment verified for order ${order.id} but its stock ` +
        `reservation could not be restored; left "${order.status}" for manual review.`,
    );

    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Payment received — confirmation pending</h1>
        <p className="mt-4 text-stone-600">
          Your payment was received, but we cannot confirm this order
          automatically. Please do not pay again — contact us with your order
          number and we will sort it out.
        </p>
        <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Order ID: <span className="font-mono break-all">{order.id}</span>
        </div>
      </main>
    );
  }

  if (outcome.kind === "cancelled") {
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">This order was cancelled</h1>
        <p className="mt-4 text-stone-600">
          This payment was received after the order was cancelled, so it was not
          applied automatically. Contact us with your order number and we will
          refund or re-place the order.
        </p>
        <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Order ID: <span className="font-mono break-all">{order.id}</span>
        </div>
      </main>
    );
  }

  if (outcome.kind === "mismatch") {
    // The URL named a different order than the authority belongs to. Neither
    // order was touched and no stock was moved.
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
        <h1 className="text-3xl font-medium">Unable to verify order</h1>
        <p className="mt-4 text-stone-600">
          This payment callback does not belong to the order it references.
        </p>
      </main>
    );
  }

  // `failed` (a real decline) and `error` (a database fault) share the same
  // customer-facing outcome: the order is not paid and the customer may retry.
  // No internal message is exposed.
  return (
    <main className="mx-auto max-w-xl px-6 py-32 text-stone-950">
      <h1 className="text-3xl font-medium">Payment verification failed</h1>
      <p className="mt-4 text-stone-600">
        The payment was not verified by ZarinPal. Please retry checkout.
      </p>
    </main>
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
