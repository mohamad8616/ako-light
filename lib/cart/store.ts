import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { clampQuantity } from "./limits";

export interface CartItem {
  productId: string;
  /** Product slug — lets consumers re-resolve a localized name at render time. */
  slug?: string;
  name: string;
  image: string;
  /** EUR price — informational display for en-locale visitors. */
  priceEur: number;
  /** Toman price — the value actually charged at checkout (ZarinPal). */
  priceToman: number;
  variantLabel?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  // Clamped to the same ceiling the server enforces, so the cart
                  // can never silently grow into a basket checkout will reject.
                  ? { ...i, quantity: clampQuantity(i.quantity + quantity) }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: clampQuantity(quantity) }],
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      // quantity <= 0 removes the item entirely, matching the "−" button
      // at qty 1 acting as a remove control. Anything above the server's
      // ceiling is clamped rather than stored, so the UI and the checkout
      // action always agree on what is a valid line.
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId
                    ? { ...i, quantity: clampQuantity(quantity) }
                    : i
                ),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: "henge-cart" }
  )
);

export function useCartTotal() {
  return useCart((state) =>
    state.items.reduce((sum, item) => sum + item.priceToman * item.quantity, 0)
  );
}

export function useCartCount() {
  return useCart((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
}

// SSR-safe hydration pattern: fixed false on the server
// and the client's first render, then settles on the real (persisted)
// value — no effect, no hydration mismatch.
const noopSubscribe = () => () => {};

export function useCartHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
