"use client";

import CartSheet from "@/components/cart/CartSheet";
import FloatingCartButton from "@/components/cart/FloatingCartButton";
import ProductModal from "@/components/cart/ProductModal";
import { Product } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useLenis } from "@/lib/lenisStore";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// Drop this pattern wherever your "Buy Now" button lives (e.g. the
// fragrance hero section). All three pieces are independent — the
// FloatingCartButton doesn't care how CartSheet got opened, it just
// needs somewhere to call when clicked.
export default function BuyBtn({ product }: { product: Product }) {
  const { t, lang } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { lock, unlock } = useLenis();

  useEffect(() => {
    if (modalOpen || cartOpen) lock();
    else unlock();
  }, [modalOpen, lock, unlock, cartOpen]);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={cn(
          "my-10 cursor-pointer bg-white px-8 py-3 text-sm font-medium text-stone-950",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {t("product.buyNow")}
      </button>

      <ProductModal
        product={product}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      <FloatingCartButton onClick={() => setCartOpen(true)} />
    </>
  );
}
