/**
 * Cart quantity limits (Pass 14 §6).
 *
 * The server has always capped a line at 1,000 (the zod schema in
 * `createPendingOrder`), but the client cart did not — so the UI could silently
 * build a basket that checkout would then reject with a generic error. These
 * tests pin the two halves of the fix:
 *
 *   - `clampQuantity` is the shared rule, and
 *   - the cart STORE actually applies it, so `addItem` / `setQuantity` cannot
 *     grow a line past the ceiling the server enforces.
 */
import { describe, expect, it } from "vitest";
import { clampQuantity, MAX_ITEM_QUANTITY } from "@/lib/cart/limits";
import { useCart, type CartItem } from "@/lib/cart/store";

describe("clampQuantity", () => {
  it("keeps a quantity inside the valid range unchanged", () => {
    expect(clampQuantity(1)).toBe(1);
    expect(clampQuantity(7)).toBe(7);
    expect(clampQuantity(MAX_ITEM_QUANTITY)).toBe(MAX_ITEM_QUANTITY);
  });

  it("raises anything below 1 to 1", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
  });

  it("caps anything above the ceiling at the ceiling", () => {
    expect(clampQuantity(MAX_ITEM_QUANTITY + 1)).toBe(MAX_ITEM_QUANTITY);
    expect(clampQuantity(1_000_000)).toBe(MAX_ITEM_QUANTITY);
  });

  it("truncates a fractional quantity rather than storing it", () => {
    expect(clampQuantity(2.9)).toBe(2);
    expect(clampQuantity(0.4)).toBe(1);
  });

  it("falls back to 1 for a non-finite input", () => {
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("pins the ceiling value the server's zod schema also uses", () => {
    // `createPendingOrder` re-exports THIS constant rather than declaring its
    // own, so the two cannot drift by construction — and the value itself is
    // pinned here so a silent change to either the cap or the error message
    // ("between 1 and 1000") is caught.
    //
    // Deliberately not imported from `@/lib/actions/checkout`: that module is
    // `"use server"` and pulls in Prisma, which cannot be loaded in the
    // hermetic unit tier.
    expect(MAX_ITEM_QUANTITY).toBe(1_000);
  });
});

describe("cart store quantity limits", () => {
  function item(productId: string): Omit<CartItem, "quantity"> {
    return {
      productId,
      slug: productId,
      name: "Test",
      image: "/test.jpg",
      priceEur: 10,
      priceToman: 1_000_000,
    };
  }

  it("clamps an oversized addItem to the ceiling", () => {
    const id = `clamp-add-${Math.random().toString(36).slice(2)}`;
    useCart.getState().addItem(item(id), 5_000);

    const line = useCart.getState().items.find((i) => i.productId === id);
    expect(line?.quantity).toBe(MAX_ITEM_QUANTITY);

    useCart.getState().removeItem(id);
  });

  it("clamps when repeated adds would exceed the ceiling", () => {
    const id = `clamp-repeat-${Math.random().toString(36).slice(2)}`;
    useCart.getState().addItem(item(id), MAX_ITEM_QUANTITY - 1);
    useCart.getState().addItem(item(id), 50);

    const line = useCart.getState().items.find((i) => i.productId === id);
    expect(line?.quantity).toBe(MAX_ITEM_QUANTITY);

    useCart.getState().removeItem(id);
  });

  it("clamps setQuantity to the ceiling", () => {
    const id = `clamp-set-${Math.random().toString(36).slice(2)}`;
    useCart.getState().addItem(item(id), 1);
    useCart.getState().setQuantity(id, 99_999);

    const line = useCart.getState().items.find((i) => i.productId === id);
    expect(line?.quantity).toBe(MAX_ITEM_QUANTITY);

    useCart.getState().removeItem(id);
  });

  it("still removes a line at quantity <= 0", () => {
    const id = `clamp-remove-${Math.random().toString(36).slice(2)}`;
    useCart.getState().addItem(item(id), 3);
    useCart.getState().setQuantity(id, 0);

    expect(
      useCart.getState().items.find((i) => i.productId === id),
    ).toBeUndefined();
  });
});
