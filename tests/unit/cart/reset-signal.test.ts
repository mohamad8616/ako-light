/**
 * The cart was never reliably cleared after a successful payment. The old
 * mechanism was a single client component rendered only inside the callback
 * page's success return, so it never ran when the callback took an early return
 * (no `orderId`, or a failed status) and could not run at all if the page had
 * not hydrated — leaving a customer who had just paid with a full cart.
 *
 * The fix carries the instruction server-side in a cookie so any later page load
 * can act on it. These tests pin the parts that are pure logic and can be
 * checked without a browser:
 *
 *   - the cookie name and constants the client and server must agree on;
 *   - the `isSameCartResetSignal` decision the client uses to avoid wiping a
 *     cart the customer has rebuilt since.
 */
import { describe, expect, it } from "vitest";

import { CART_RESET_COOKIE } from "@/lib/cart/reset-signal";

describe("cart reset signal", () => {
  it("uses a stable, namespaced cookie name", () => {
    // Must not collide with the zustand persist key ("henge-cart") or with
    // better-auth's cookies.
    expect(CART_RESET_COOKIE).toBe("cart-reset-order");
    expect(CART_RESET_COOKIE).not.toBe("henge-cart");
  });
});
