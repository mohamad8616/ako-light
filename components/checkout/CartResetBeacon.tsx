"use client";

import { useEffect, useRef } from "react";

/**
 * Points the browser at the cart-reset Route Handler when this page rendered a
 * durable payment success.
 *
 * WHY A BEACON AND NOT A SERVER-SIDE CALL
 * ---------------------------------------
 * The durable "empty the cart" signal is a cookie, and a cookie can only be set
 * in a Route Handler or Server Action — not from a Server Component render.
 * This component is rendered ONLY on a success view whose server side has
 * already durably recorded the order as paid, so mounting it is the browser
 * confirmation that settlement won.
 *
 * SAFETY
 * ------
 * It carries no proof of payment and cannot create one: the handler re-reads
 * the order and refuses unless it is already `paid` in the database. Its only
 * effect is to (re-)set an HttpOnly cookie whose value is the order id. A
 * refresh, a double-mount, or a re-render just re-sends the same id —
 * idempotent, and the client de-duplicates on the id so a rebuilt cart is never
 * wiped. It never reads or trusts any client-side "payment succeeded" flag.
 *
 * It renders nothing and never blocks the confirmation view; the visible
 * cart-clearing the customer sees immediately is done by
 * `PaymentCallbackState`, and the durable path is completed by
 * `CartResetOnPaidOrder` on the next layout render once the cookie is set.
 */
export default function CartResetBeacon({ orderId }: { orderId: string }) {
  // One send per order id per page life — the dev-mode double-invoke and any
  // re-render must not fire the request twice.
  const sentRef = useRef<string | null>(null);

  useEffect(() => {
    if (sentRef.current === orderId) return;
    sentRef.current = orderId;

    // Fire-and-forget. If the network drops, the durable signal simply is not
    // set for this visit; the customer's cart on THIS page is still cleared by
    // PaymentCallbackState, and a later success render re-sends the beacon.
    void fetch("/api/checkout/cart-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
      // Same-origin, credentials not needed (the handler is not session-gated),
      // but "same-origin" keeps any ambient cookie flowing consistently.
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  }, [orderId]);

  return null;
}
