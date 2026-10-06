/**
 * Cart-reset signal — the invariants the fix depends on.
 *
 * HISTORY (why this file changed)
 * -------------------------------
 * The durable "empty the cart after a successful payment" signal is carried in
 * an HttpOnly cookie (`CART_RESET_COOKIE`) set server-side. The first version
 * set it directly from the checkout callback PAGE — a Server Component render —
 * where `cookies().set()` throws `ReadonlyRequestCookiesError` ("Cookies can
 * only be modified in a Server Action or Route Handler"). The throw was
 * swallowed, so on a real payment the durable signal was NEVER written: the
 * cart only ever emptied when the fast-path client component happened to
 * hydrate, and never in the cases the cookie exists to cover.
 *
 * The fix moves the write into a Route Handler
 * (`app/api/checkout/cart-reset/route.ts`). These tests are static-source
 * assertions (no jsdom, no server) that pin the SHAPE of the fix so the
 * regression cannot silently return:
 *
 *   - the cookie name the client and server must agree on;
 *   - the callback page no longer calling `cookies().set()` (directly or via
 *     `signalCartReset`) from its render;
 *   - the reset touching ONLY the cart's `items` slice — never
 *     `localStorage.clear()` and never a whole-store reset, which would destroy
 *     unrelated persisted state.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CART_RESET_COOKIE } from "@/lib/cart/reset-signal";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, `file://${root}`), "utf8");
}

/** Strips `//` line comments so assertions cannot match explanatory prose. */
function stripLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const index = line.indexOf("//");
      return index === -1 ? line : line.slice(0, index);
    })
    .join("\n");
}

describe("cart reset signal", () => {
  it("uses a stable, namespaced cookie name", () => {
    // Must not collide with the zustand persist key ("henge-cart") or with
    // better-auth's cookies.
    expect(CART_RESET_COOKIE).toBe("cart-reset-order");
    expect(CART_RESET_COOKIE).not.toBe("henge-cart");
  });

  it("does NOT mutate cookies from the callback page's render path", () => {
    // The exact regression: `signalCartReset` (which calls `cookies().set`)
    // must not be invoked from the Server Component render. It may only be
    // mentioned in prose.
    const page = stripLineComments(
      read("app/[locale]/(site)/checkout/callback/page.tsx"),
    );

    expect(page).not.toContain("signalCartReset(");
    expect(page).not.toContain("cookies().set");
    expect(page).not.toContain("cookies().delete");
  });

  it("writes the signal from a Route Handler, not a render", () => {
    const route = read("app/api/checkout/cart-reset/route.ts");

    // It uses the shared writer and gates on the already-settled `paid` status
    // — so it stays strictly downstream of the authoritative payment outcome.
    expect(route).toContain("signalCartReset");
    expect(route).toContain('status !== "paid"');
    expect(route).toContain("export async function POST");
  });

  it("clears only the cart's items slice, never global persistence", () => {
    const store = read("lib/cart/store.ts");

    // The cart's own reset is `set({ items: [] })`.
    expect(store).toContain("clearCart: () => set({ items: [] })");

    // And nothing in the reset path may nuke unrelated persisted state.
    const resetComponent = stripLineComments(
      read("components/cart/CartResetOnPaidOrder.tsx"),
    );
    const beacon = stripLineComments(
      read("components/checkout/CartResetBeacon.tsx"),
    );

    for (const source of [store, resetComponent, beacon]) {
      expect(source).not.toContain("localStorage.clear");
      expect(source).not.toContain("sessionStorage.clear");
      // `setState`/`persist.clearStorage` would wipe every persisted store.
      expect(source).not.toContain("clearStorage");
    }
  });
});
