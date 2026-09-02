"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart/store";
import { Product } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { productDescription, productName } from "@/lib/i18n/localized";
import Image from "next/image";

interface Props {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductModal({ product, open, onOpenChange }: Props) {
  const actionsRef = useRef<{ unmount: () => void; close: () => void } | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);
  const { t } = useLanguage();

  function handleAddToCart() {
    addItem(
      {
        productId: product.id,
        name: productName(t, product.slug),
        image: product.images[0],
        price: product.price,
        currency: "EUR",
      },
      quantity
    );
    onOpenChange(false);
  }

  function showPrev() {
    setActiveImage((i) => (i - 1 + product.images.length) % product.images.length);
  }
  function showNext() {
    setActiveImage((i) => (i + 1) % product.images.length);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen) {
          // Keep the popup mounted so the framer-motion exit animation can play.
          eventDetails.preventUnmountOnClose();
        }
        onOpenChange(nextOpen);
      }}
      actionsRef={actionsRef}
    >
      <DialogContent
        className="border-0 bg-white p-0 text-stone-950"
        motionProps={{
          initial: { opacity: 0, scale: 0.96 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.96 },
          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        }}
        onExitComplete={() => actionsRef.current?.unmount()}
      >
        <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2 md:gap-10 md:p-10">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
              <Image
                src={product.images[activeImage]}
                alt={productName(t, product.slug)}
                fill
                className="object-cover"
              />

              {/* Prev/next — mobile convenience alongside the thumbnails below */}
              <button
                onClick={showPrev}
                aria-label="Previous image"
                className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/80 text-stone-950 shadow transition-colors hover:bg-white md:hidden"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={showNext}
                aria-label="Next image"
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/80 text-stone-950 shadow transition-colors hover:bg-white md:hidden"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Thumbnails — primary way to switch images */}
            <div className="flex gap-2">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden border transition-colors ${
                    activeImage === i
                      ? "border-stone-950"
                      : "border-transparent hover:border-stone-300"
                  }`}
                >
                  <Image src={src} alt="" width={64} height={64} className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <h2 className="font-din text-2xl font-medium text-stone-950">{productName(t, product.slug)}</h2>
            <p className="font-din mt-2 text-lg text-stone-950">
              {formatPrice(product.price)}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center border border-stone-300">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-950 hover:bg-stone-100"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-950 hover:bg-stone-100"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="font-din flex-1 cursor-pointer bg-stone-950 py-3 text-sm font-medium tracking-tight text-white uppercase transition-colors hover:bg-stone-800"
              >
                {t("product.addToCart")}
              </button>
            </div>

            <div className="font-din mt-6 flex flex-col gap-4 text-sm leading-relaxed text-stone-600">
              <p>{productDescription(t, product.slug)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatPrice(amount: number, currency = "EUR") {
  const symbol = currency === "EUR" ? "€" : currency;
  return `${symbol}${amount.toFixed(2).replace(".", ",")}`;
}
