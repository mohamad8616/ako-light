"use client";

import { ShoppingCart } from "lucide-react";
import { useCartCount, useCartHydrated } from "@/lib/cart/store";

interface Props {
  onClick: () => void;
}

export default function FloatingCartButton({ onClick }: Props) {
  const hydrated = useCartHydrated();
  const count = useCartCount();

  // Hidden until hydrated (avoids a mismatch) and until something's
  // actually in the cart.
  if (!hydrated || count === 0) return null;

  return (
    <button
      onClick={onClick}
      aria-label={`Cart (${count} item${count === 1 ? "" : "s"})`}
      className="fixed right-6 bottom-6 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-stone-950 text-white shadow-lg transition-transform hover:scale-105 md:right-8 md:bottom-8"
    >
      <ShoppingCart size={20} strokeWidth={2} />
      <span className="font-din absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-medium text-stone-950">
        {count}
      </span>
    </button>
  );
}
