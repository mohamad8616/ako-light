"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import LightboxModal from "@/components/ui/imageGalleryCarousel/LightboxModal";
import { useCart } from "@/lib/cart/store";
import type { Product } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { productDescription, productName } from "@/lib/i18n/localized";
import { useLenis } from "@/lib/lenisStore";
import { EASE } from "@/utility/HomepageSection";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

interface Props {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductModal({ product, open, onOpenChange }: Props) {
  const actionsRef = useRef<{ unmount: () => void; close: () => void } | null>(
    null,
  );
  const [activeImage, setActiveImage] = useState(0);
  const [quantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // SSR-safe mount check — LightboxModal portals to `document.body`, which
  // only exists after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Render-phase resets (React-endorsed "adjust state during render" pattern):
  // restart the gallery when a different product is shown or the modal
  // reopens, and close a stale lightbox. No refs touched here.
  const [lastProductId, setLastProductId] = useState(product.id);
  const [lastOpen, setLastOpen] = useState(open);
  if (product.id !== lastProductId) {
    setLastProductId(product.id);
    setActiveImage(0);
    setLightboxOpen(false);
  }
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setActiveImage(0);
    setLightboxOpen(false);
  }
  const trackRef = useRef<HTMLDivElement>(null);
  const addItem = useCart((state) => state.addItem);
  const { dir, lang, t } = useLanguage();
  const { lock } = useLenis();
  // Noora for Persian / DinNext for English — same pairing as CartSheet
  // and ProductsSheet, so every Persian string renders in the Persian face.
  const fontClass = lang === "fa" ? "font-noora" : "font-din";

  // Keep the page scroll locked while the ProductModal is visible. The
  // Lightbox locks on mount and unlocks on unmount, so re-lock here when the
  // Lightbox closes while the ProductModal is still open.
  useEffect(() => {
    if (open && !lightboxOpen) lock();
  }, [open, lightboxOpen, lock]);

  // Same photos as the ProductModal gallery, in LightboxModal item shape.
  const lightboxItems = useMemo(
    () => product.images.map((src) => ({ image: src })),
    [product.images],
  );

  // Keep the active thumbnail visible inside the scrollable rail
  // (DOM-only effect, no setState — lint-safe).
  useEffect(() => {
    const child = trackRef.current?.children[activeImage] as
      HTMLElement | undefined;
    child?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [activeImage]);

  function handleAddToCart() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: productName(t, product.slug),
        image: product.images[0],
        price: product.price,
        currency: "EUR",
      },
      quantity,
    );
    onOpenChange(false);
  }

  // Hide the ProductModal Dialog while the Lightbox is open so the Lightbox
  // (a z-200 portal on document.body) sits on top without focus-trap,
  // Escape-key, or scroll-lock conflicts. The parent `open` state is left
  // untouched, so closing the Lightbox restores the ProductModal as it was.
  const dialogOpen = open && !lightboxOpen;

  return (
    <>
      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen, eventDetails) => {
          // Ignore events caused by the Lightbox-driven hide/restore so the
          // parent open state never desyncs.
          if (lightboxOpen) return;
          if (!nextOpen) {
            // Keep the popup mounted so the framer-motion exit animation can play.
            eventDetails.preventUnmountOnClose();
          }
          onOpenChange(nextOpen);
        }}
        actionsRef={actionsRef}
      >
        <DialogContent
          className="max-h-4/5 w-[94vw] overflow-hidden border-0 bg-white p-0 text-stone-950 md:max-w-4xl lg:h-4/5 lg:max-h-4/5 lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl z-1000  "
          motionProps={{
            initial: { opacity: 0, scale: 0.96 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.96 },
            transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
          }}
          onExitComplete={() => actionsRef.current?.unmount()}
        >
          <div className="grid grid-cols-1 gap-6 overflow-hidden p-6 sm:p-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-10 md:p-10 lg:h-4/5 lg:max-h-4/5 lg:min-h-0 lg:p-12 2xl:gap-14 2xl:p-14">
            {/* Gallery — main photo on top, thumbnail strip below. On large
              screens the column fills the fixed 4/5-height modal: the photo
              takes the free space (min-h-0) while the strip keeps its fixed
              64px height and excess thumbs clip invisibly (no scrollbar). */}
            <div className="flex min-h-0 flex-col gap-3 lg:h-full">
              {/* Main photo — slow smooth cross-fade when the thumbnail changes. */}
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-stone-100">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={product.images[activeImage]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: EASE }}
                    className="absolute inset-0"
                  >
                    {/* Clicking the main photo (not the thumbnails) opens the Lightbox. */}
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label={t("product.viewImage").replace(
                        "{number}",
                        String(activeImage + 1),
                      )}
                      className="absolute inset-0 h-full w-full cursor-zoom-in"
                    >
                      <Image
                        src={product.images[activeImage]}
                        alt={productName(t, product.slug)}
                        fill
                        className="object-cover"
                      />
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Thumbnail strip below the main photo — fixed 64px thumbs like
                the original design; hidden overflow, no scrollbar, no arrows.
                Active thumb is outlined; the rest dim on hover. */}
              <div
                ref={trackRef}
                data-lenis-prevent
                dir={dir === "rtl" ? "rtl" : "ltr"}
                className="no-scrollbar flex h-16 w-full shrink-0 flex-row gap-2 overflow-hidden"
              >
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={t("product.viewImage").replace(
                      "{number}",
                      String(i + 1),
                    )}
                    className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden border transition-colors ${
                      activeImage === i
                        ? "border-stone-950"
                        : "border-transparent hover:border-stone-300"
                    }`}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col">
              <h2
                className={`${fontClass} text-2xl font-medium text-stone-950`}
              >
                {productName(t, product.slug)}
              </h2>
              <p className={`${fontClass} mt-2 text-lg text-stone-950`}>
                {formatPrice(product.price)}
              </p>

              <div className="mt-6 flex items-center gap-3">
                {/* <div className="flex items-center border border-stone-300">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label={t("cart.decreaseQuantity")}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-950 hover:bg-stone-100"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label={t("cart.increaseQuantity")}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-950 hover:bg-stone-100"
                >
                  +
                </button>
              </div> */}

                <button
                  onClick={handleAddToCart}
                  className={`${fontClass} flex-1 cursor-pointer bg-stone-950 py-3 text-sm font-medium tracking-tight text-white uppercase transition-colors hover:bg-stone-800`}
                >
                  {t("product.addToCart")}
                </button>
              </div>

              <div
                className={`${fontClass} mt-6 flex flex-col gap-4 text-sm leading-relaxed text-stone-600`}
              >
                <p>{productDescription(t, product.slug)}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {mounted && lightboxOpen && (
        <LightboxModal
          items={lightboxItems}
          startIndex={activeImage}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

function formatPrice(amount: number, currency = "EUR") {
  const symbol = currency === "EUR" ? "€" : currency;
  return `${symbol}${amount.toFixed(2).replace(".", ",")}`;
}
