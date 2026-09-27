"use client";

import { useCart } from "@/lib/cart/store";
import { useEffect } from "react";

export default function PaymentCallbackState({ success }: { success: boolean }) {
  const clearCart = useCart((state) => state.clearCart);

  useEffect(() => {
    if (success) {
      clearCart();
    }
  }, [clearCart, success]);

  return null;
}
