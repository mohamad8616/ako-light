"use client";

import { useCart } from "@/lib/cart/store";
import { useEffect, useRef } from "react";

/**
 * Immediately empties the cart when the callback page itself renders a
 * successful payment.
 *
 * This is the FAST path: the customer is looking at the confirmation page right
 * now, and the cart should visibly be gone without a page change. The DURABLE
 * path lives in `CartResetOnPaidOrder` (mounted in the site layout), which
 * covers every case this component cannot reach — a render that returns before
 * this mounts, an un-hydrated page, a closed tab, a return visit later. The
 * server records the same fact in a cookie (lib/cart/reset-signal.ts), and both
 * paths key off the order id so they cannot fight: clearing an already-empty
 * cart is a no-op, so running both is harmless and neither double-clears
 * anything the customer has rebuilt.
 *
 * `success` is false for a non-payment (the page renders this with
 * `Boolean(refId)`), in which case nothing happens.
 */
export default function PaymentCallbackState({
  success,
  orderId,
}: {
  success: boolean;
  /** The paid order, used to distinguish one successful payment from another. */
  orderId?: string;
}) {
  const clearCart = useCart((state) => state.clearCart);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!success) return;

    // Keyed on the order so a re-render (or React's development double-invoke)
    // clears once per payment rather than once per render.
    const key = orderId ?? "paid";
    if (handledRef.current === key) return;
    handledRef.current = key;

    clearCart();
  }, [clearCart, orderId, success]);

  return null;
}
