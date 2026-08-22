import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";

export interface WishlistItem {
  id: string;
  name: string;
  code: string;
  category: string;
  swatchColor: string;
}

interface WishlistState {
  items: WishlistItem[];
  isSaved: (id: string) => boolean;
  toggleItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      isSaved: (id) => get().items.some((item) => item.id === id),

      toggleItem: (item) =>
        set((state) => ({
          items: state.items.some((i) => i.id === item.id)
            ? state.items.filter((i) => i.id !== item.id)
            : [...state.items, item],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
    }),
    { name: "henge-wishlist" },
  ),
);

// useSyncExternalStore never actually needs to "subscribe" here — the
// value it returns is constant per environment (server vs. client), so
// the subscribe function is a no-op. This is the pattern React itself
// recommends for "does the client differ from the server snapshot"
// checks: https://react.dev/reference/react/useSyncExternalStore
const noopSubscribe = () => () => {};

/**
 * The persisted store starts empty on the server and only picks up
 * localStorage after mount, so a component that renders differently
 * based on `items` (the navbar heart, each card's filled state) needs
 * to know whether that client-side load has happened yet — otherwise
 * React logs a hydration mismatch the first time something is saved.
 *
 * Usage: `const hydrated = useWishlistHydrated();` and treat the store
 * as empty (or hide UI that depends on it) until this returns true.
 */
export function useWishlistHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
