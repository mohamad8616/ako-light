export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records the durable "your payment succeeded, empty the cart" signal.
 *
 * WHY THIS IS A ROUTE HANDLER
 * ---------------------------
 * Setting a cookie is only legal in Next's `action` phase. The checkout
 * callback is a Server Component PAGE — a `render` phase — so a
 * `cookies().set()` there throws `ReadonlyRequestCookiesError` and, because the
 * original code swallowed it, the durable signal was never written on a real
 * payment. This handler is the legitimate mutation context the callback page
 * points its success render at (see lib/cart/reset-signal.ts for the full
 * history).
 *
 * SAFETY — this endpoint does NOT decide that a payment succeeded
 * -----------------------------------------------------------------
 * It is downstream of settlement, never a substitute for it. It refuses unless
 * the named order is ALREADY DURABLY `paid` in the database, which only the
 * payment callback can cause (via `settlePayment`). So:
 *
 *   - reaching this URL with any other order id does nothing;
 *   - a failed / cancelled / unconfirmed / unknown-authority order is refused;
 *   - a browser cannot mark an order paid by calling this, and cannot use it to
 *     clear a cart that belongs to an unpaid order;
 *   - it is IDEMPOTENT: calling it again for an already-paid order simply
 *     re-sets the same cookie value (the order id), which the client
 *     de-duplicates. A refresh or a duplicate callback cannot clear a rebuilt
 *     cart, because the value is stable per order.
 *
 * It writes only an HttpOnly cookie. It never reads or returns customer data,
 * never touches stock, and never calls the gateway.
 *
 * WHY NOT AUTH-GATED
 * ------------------
 * The signal is per-browser and only ever causes THIS browser's cart to empty.
 * A signed token / different-device confirmation legitimately reaches the
 * callback without a session, and its own cart must still be cleared. Gating on
 * a session would silently break that path. Possession of the (unguessable uuid)
 * order id plus the fact that the order is already paid is the whole trust
 * boundary, and the worst case of a guessed id is a cleared cart — never a
 * payment, stock, or order-state change.
 */
import { signalCartReset } from "@/lib/cart/reset-signal";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request): Promise<Response> {
  const noStore = { "Cache-Control": "no-store" } as const;

  let orderId: string | undefined;
  try {
    const body = (await request.json()) as { orderId?: unknown };
    if (typeof body.orderId === "string" && body.orderId.length > 0) {
      orderId = body.orderId;
    }
  } catch {
    // Malformed body — treated exactly like a missing order id below.
  }

  if (!orderId) {
    return Response.json({ ok: false, reason: "missing_order_id" }, {
      status: 400,
      headers: noStore,
    });
  }

  // The ONLY condition for signalling: the order is already durably paid. This
  // is a read; the `paid` status can only have been written by the settlement
  // path. No client input can influence it.
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!order || order.status !== "paid") {
    return Response.json({ ok: false, reason: "not_paid" }, {
      status: 409,
      headers: noStore,
    });
  }

  // Legal here (Route Handler = `action` phase). Deliberately not swallowed: if
  // the phase assumption ever regresses, this should fail loudly rather than
  // quietly leave a paying customer with a full cart.
  await signalCartReset(order.id);

  return Response.json({ ok: true }, { status: 200, headers: noStore });
}
