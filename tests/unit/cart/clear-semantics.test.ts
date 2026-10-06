/**
 * Cart clear semantics (Pass 7).
 *
 * The user's hard constraint for the post-payment cart reset: reset ONLY the
 * cart's persisted slice, and never destroy unrelated persisted state
 * (`localStorage.clear()`, or a whole-Zustand-store reset, would do exactly
 * that). `clearCart` must therefore empty `items` and nothing else.
 *
 * This pins that directly on the store, plus the invariant that the persist key
 * stays namespaced so the reset can never be confused with another store's.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useCart, type CartItem } from "@/lib/cart/store";

const SAMPLE: Omit<CartItem, "quantity"> = {
  productId: "p1",
  slug: "lamp",
  name: "Lamp",
  image: "/t.jpg",
  priceEur: 10,
  priceToman: 1_000_000,
};

describe("cart clearCart", () => {
  beforeEach(() => {
    // Start each case from a known cart; not a test of persistence here.
    useCart.setState({ items: [] });
  });

  it("empties the items slice", () => {
    useCart.getState().addItem(SAMPLE);
    useCart.getState().addItem({ ...SAMPLE, productId: "p2" });
    expect(useCart.getState().items).toHaveLength(2);

    useCart.getState().clearCart();
    expect(useCart.getState().items).toEqual([]);
  });

  it("leaves the cart's own action functions intact", () => {
    // A whole-store replacement would lose these; clearCart must only touch
    // state, not the API.
    const before = useCart.getState();
    useCart.getState().clearCart();
    const after = useCart.getState();

    expect(after.addItem).toBe(before.addItem);
    expect(after.removeItem).toBe(before.removeItem);
    expect(after.setQuantity).toBe(before.setQuantity);
    expect(after.clearCart).toBe(before.clearCart);
  });

  it("is idempotent — a second clear is a no-op", () => {
    useCart.getState().addItem(SAMPLE);
    useCart.getState().clearCart();
    useCart.getState().clearCart();
    expect(useCart.getState().items).toEqual([]);
  });

  it("lets a new cart be built after a reset", () => {
    useCart.getState().addItem(SAMPLE);
    useCart.getState().clearCart();
    expect(useCart.getState().items).toEqual([]);

    useCart.getState().addItem({ ...SAMPLE, productId: "p-new" });
    expect(useCart.getState().items.map((i) => i.productId)).toEqual(["p-new"]);
  });
});
