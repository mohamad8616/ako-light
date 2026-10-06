/**
 * Durable "your payment succeeded, empty the cart" signal.
 *
 * WHY A COOKIE AND NOT JUST A CLIENT EFFECT
 * -----------------------------------------
 * The original bug: the cart was cleared only by `PaymentCallbackState`, a
 * client component rendered ONLY inside the callback page's success return. So
 * it never ran when:
 *
 *   - the callback had no `orderId` (its own early return), or
 *   - the gateway reported a failure,
 *
 * which left the customer's cart intact after they had already paid — the most
 * confusing possible state, since the cart still showed goods the money had
 * bought.
 *
 * A client-only reset is also structurally fragile for the success path itself:
 * JavaScript may not have hydrated yet, the customer may have closed the tab on
 * the gateway and reopened the shop later, or the callback may have been opened
 * on a different device from the phone/laptop holding the cart. In all of those
 * cases the one-shot client component never gets to run.
 *
 * So the payment's success is recorded SERVER-SIDE, in a short-lived cookie, at
 * the moment the payment is durably persisted. Any subsequent page render on
 * that browser can then observe it and empty the cart — whenever and wherever
 * the customer next loads the site. The cookie is HttpOnly because only the
 * server needs to read it; the client learns it must act through the prop the
 * server passes down (see components/cart/CartResetOnPaidOrder.tsx).
 *
 * The cookie value is the order id, so the client can de-duplicate: the same
 * successful order never triggers a reset twice, even across reloads or
 * multiple tabs.
 *
 * WHERE THE WRITE HAPPENS (the part that was wrong)
 * -------------------------------------------------
 * `cookies().set()` is legal ONLY during Next's `action` phase — i.e. in a
 * Route Handler or a Server Action. During a page's `render` phase it throws
 * `ReadonlyRequestCookiesError`. This module's first version called
 * `signalCartReset` from the checkout callback PAGE (a Server Component) and
 * swallowed the resulting throw, so on a real payment the durable signal was
 * never written at all: the cart only ever emptied when `PaymentCallbackState`
 * happened to hydrate, and never in the situations this cookie exists to cover.
 *
 * The write now happens in a Route Handler (`app/api/checkout/cart-reset/`)
 * that the page's success render points the browser at — a legitimate mutation
 * context. The read (`readCartResetSignal`) still happens in Server Components
 * and is unaffected, because reading a cookie is always allowed.
 */
import { cookies } from "next/headers";

/** Name of the signal cookie. Exported so the client component and tests agree. */
export const CART_RESET_COOKIE = "cart-reset-order";

/**
 * How long the signal stays valid. Long enough that a customer who pays on
 * their phone and opens the site on that phone the next day still gets their
 * cart cleared; short enough that it never lingers. It only ever causes the
 * cart to be emptied, so the worst case of it firing late is a cleared cart.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Records that the order whose payment just succeeded should clear the cart.
 *
 * MUST be called from a Route Handler or Server Action, never from a Server
 * Component render. `cookies().set()` is only permitted in the `action` phase;
 * during a page's `render` phase Next throws `ReadonlyRequestCookiesError`
 * ("Cookies can only be modified in a Server Action or Route Handler").
 *
 * This is exactly the bug this module shipped with: the checkout callback page
 * is a Server Component, so its original call site threw here and — because the
 * error was swallowed — the durable signal silently never reached the browser.
 * Only the fast path (`PaymentCallbackState`) ever cleared the cart; the
 * durable one never fired.
 *
 * The correct call site is therefore a Route Handler that runs after the
 * `paid` transition has been durably written (see
 * `app/api/checkout/cart-reset/route.ts`), which is where payment success is
 * already established server-side. The throw is deliberately NOT swallowed: if
 * this ever runs in the wrong phase again, it fails loudly instead of leaving
 * paying customers with a full cart.
 */
export async function signalCartReset(orderId: string): Promise<void> {
  const store = await cookies();
  store.set(CART_RESET_COOKIE, orderId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Reads the pending signal, if any. Used by the site layout to pass the order
 * id down to the client component that performs the reset.
 */
export async function readCartResetSignal(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(CART_RESET_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Clears the signal once the client has acted on it.
 *
 * Called from a server action after the header is sent, so the flag is not
 * re-read on every later page load. Deleting is idempotent, so a double-click
 * or a retry is harmless.
 */
export async function clearCartResetSignal(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(CART_RESET_COOKIE);
  } catch (error) {
    console.error("[checkout] Could not clear the cart-reset signal:", error);
  }
}
