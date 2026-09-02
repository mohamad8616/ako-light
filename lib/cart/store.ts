import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  currency: string;
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
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      // quantity <= 0 removes the item entirely, matching the "−" button
      // at qty 1 acting as a remove control.
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: "henge-cart" }
  )
);

export function useCartTotal() {
  return useCart((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
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
