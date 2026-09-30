"use client";

import { acknowledgeCartReset } from "@/lib/actions/cart-reset";
import { useCart } from "@/lib/cart/store";
import { useEffect, useRef } from "react";

/**
 * Empties the persisted cart once a payment for `paidOrderId` has succeeded.
 *
 * This is the durable counterpart to the old one-shot `PaymentCallbackState`:
 * because the "payment succeeded" fact is stored in a cookie by the server at
 * the moment the order is marked paid (lib/cart/reset-signal.ts), this component
 * can run on ANY page the customer later loads — not only on the callback page
 * that immediately followed the payment. That covers the cases that used to
 * leave a paying customer with a full cart:
 *
 *   - the callback rendered its no-`orderId` early return and never mounted the
 *     old component;
 *   - JavaScript had not hydrated on the callback page;
 *   - the customer closed the tab on the gateway and came back to the shop
 *     later;
 *   - the callback was opened on a different device from the one holding the
 *     cart (the signal is per-browser, so the cart on THIS device is only
 *     cleared when this device itself sees a success — which is correct: this
 *     device's cart was never purchased here).
 *
 * The order id is checked against the last one acted on, so a signal that
 * happens to still be readable cannot wipe a cart the customer has since
 * rebuilt.
 */
export default function CartResetOnPaidOrder({
  paidOrderId,
}: {
  paidOrderId: string | null;
}) {
  const clearCart = useCart((state) => state.clearCart);
  // Survives the component re-rendering (and React's development
  // double-invoke), so one signal == one reset.
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!paidOrderId) return;
    if (handledRef.current === paidOrderId) return;

    handledRef.current = paidOrderId;

    // Clear the cart first, then acknowledge, so a failure to reach the server
    // leaves the cookie in place and the reset is retried on the next load.
    clearCart();

    // Fire-and-forget: the reset has already happened locally, and the cookie
    // is harmless if it survives (the ref guard makes a re-fire a no-op).
    void acknowledgeCartReset().catch(() => {});
  }, [clearCart, paidOrderId]);

  return null;
}
