"use client";

import { useState } from "react";
import ProductModal from "@/components/cart/ProductModal";
import CartSheet from "@/components/cart/CartSheet";
import FloatingCartButton from "@/components/cart/FloatingCartButton";
import { fragranceProduct34 } from "@/lib/data/fragranceProduct";

// Drop this pattern wherever your "Buy Now" button lives (e.g. the
// fragrance hero section). All three pieces are independent — the
// FloatingCartButton doesn't care how CartSheet got opened, it just
// needs somewhere to call when clicked.
export default function BuyNowExample() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="font-din cursor-pointer bg-white px-8 py-3 text-sm font-medium text-stone-950"
      >
        Buy Now
      </button>

      <ProductModal
        product={fragranceProduct34}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      <FloatingCartButton onClick={() => setCartOpen(true)} />
    </>
  );
}
