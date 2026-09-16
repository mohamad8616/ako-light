"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createCheckout } from "@/lib/cart/checkout";
import { useCart, useCartTotal, type CartItem } from "@/lib/cart/store";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { productKey } from "@/lib/i18n/localized";
import type { Product } from "@/lib/data/productCategories";
import { resolveCartProducts } from "@/lib/actions/cart";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartSheet({ open, onOpenChange }: Props) {
  const actionsRef = useRef<{ unmount: () => void; close: () => void } | null>(
    null,
  );
  const { lang, dir, t } = useLanguage();
  const isRtl = dir === "rtl";
  // Font family is inherited by all children from the SheetContent wrapper
  // (Noora for Persian / DinNext for English) — same approach as ProductsSheet.
  const fontClass = isRtl ? "font-noora" : "font-din";
  // The sheet slides in from the "end" edge of the reading direction and the
  // motion x offset is mirrored so the animation matches the physical side.
  const side = isRtl ? "left" : "right";
  const slideX = isRtl ? -400 : 400;

  const items = useCart((state) => state.items);
  const setQuantity = useCart((state) => state.setQuantity);
  const total = useCartTotal();

  // Live product records for the cart contents, resolved server-side via
  // `resolveCartProducts` whenever the sheet opens or items change. Keyed by
  // product id for id-first lookup with slug fallback (see `findProduct`).
  const [resolvedProducts, setResolvedProducts] = useState<Map<string, Product>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!open || items.length === 0) return;
    let cancelled = false;
    resolveCartProducts(
      items.map((i) => ({ productId: i.productId, slug: i.slug })),
    )
      .then((rows) => {
        if (cancelled) return;
        const byId = new Map<string, Product>();
        for (const row of rows) byId.set(row.id, row);
        setResolvedProducts(byId);
      })
      .catch((err) => {
        // Resolution is a display-name enhancement only; the sheet must keep
        // working offline/stale-cart, so log and keep the previous map.
        console.error("Failed to resolve cart products:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [open, items]);

  const [notes, setNotes] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleCheckout() {
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const { url } = await createCheckout(items);
      window.location.href = url;
    } catch (err) {
      // The technical error stays in the console for developers; the user
      // always sees the localized message.
      console.error("Checkout failed:", err);
      setCheckoutError(t("cart.error"));
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen) {
          eventDetails.preventUnmountOnClose();
        }
        onOpenChange(nextOpen);
      }}
      actionsRef={actionsRef}
    >
      <SheetContent
        side={side}
        
        className={`z-999 ${fontClass} flex flex-col border-0 bg-white p-6 text-stone-950 outline-0`}
        motionProps={{
          initial: { x: slideX },
          animate: { x: 0 },
          exit: { opacity: 1, x: slideX },
          transition: { duration: 0.4, ease: "easeInOut" },
        }}
        onExitComplete={() => actionsRef.current?.unmount()}
      >
        <SheetHeader className="p-0 pb-6">
          <SheetTitle className="text-lg font-medium text-stone-950">
            {t("cart.title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-stone-500">
              {t("cart.empty")}
            </p>
          ) : (
            items.map((item) => {
              const displayName = itemDisplayName(item, resolvedProducts, t);
              return (
              <div key={item.productId} className="flex gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-stone-100">
                  <Image
                    src={item.image}
                    alt={displayName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-stone-950">
                        {displayName}
                      </p>
                      {item.variantLabel && (
                        <p className="text-xs text-stone-500">
                          {item.variantLabel}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-stone-950">
                      {formatPrice(
                        item.price * item.quantity,
                        item.currency,
                        lang,
                      )}
                    </p>
                  </div>
                  <div className="flex w-fit items-center border border-stone-300">
                    <button
                      onClick={() =>
                        setQuantity(item.productId, item.quantity - 1)
                      }
                      aria-label={`${t("cart.decreaseQuantity")}: ${displayName}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-stone-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity(item.productId, item.quantity + 1)
                      }
                      aria-label={`${t("cart.increaseQuantity")}: ${displayName}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-stone-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-4 pt-6">
            <div className="flex items-center justify-between border-t border-stone-200 pt-4">
              <span className="text-sm font-medium text-stone-950 uppercase">
                {t("cart.total")}
              </span>
              <span className="text-sm text-stone-950">
                {formatPrice(total, items[0]?.currency ?? "EUR", lang)}
              </span>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs text-stone-500">
                {t("cart.notes")}
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none border border-stone-300 p-2 text-sm outline-none focus:border-stone-950"
              />
            </label>
            <p className="text-xs text-stone-400">
              {t("cart.shippingNote")}
            </p>

            {checkoutError && (
              <p className="text-xs text-red-600">{checkoutError}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full cursor-pointer bg-stone-950 py-3 text-sm font-medium tracking-tight text-white uppercase transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingOut ? t("cart.redirecting") : t("cart.checkout")}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Find the live product backing a cart item — by id first, then by the
 * stored slug. Looking the product up (instead of trusting the persisted
 * `name`) is what lets the display name follow the active language, and it
 * also covers carts persisted before the `slug` field existed. Products that
 * no longer exist resolve to `undefined` so callers can fall back to the
 * stored name.
 */
function findProduct(
  item: CartItem,
  resolved: Map<string, Product>,
): Product | undefined {
  const byId = resolved.get(item.productId);
  if (byId) return byId;
  if (item.slug !== undefined) {
    for (const product of resolved.values()) {
      if (product.slug === item.slug) return product;
    }
  }
  return undefined;
}

/**
 * Resolve the cart item's display name in the active language. The product is
 * re-resolved from data and its name pulled from translations at render time,
 * so a cart persisted while browsing in Persian then viewed in English shows
 * English names (and vice versa). Falls back to the name stored at add-time
 * when the product no longer exists or has no translation.
 */
function itemDisplayName(
  item: CartItem,
  resolved: Map<string, Product>,
  t: (key: string) => string,
): string {
  const product = findProduct(item, resolved);
  if (product) {
    const key = productKey(product.slug);
    const resolvedName = t(key);
    if (resolvedName !== key) return resolvedName;
  }
  return item.name;
}

/**
 * Placeholder EUR -> IRR rate used when displaying prices in Persian.
 * TODO: replace with a live rate source or a business-managed value.
 */
const EUR_TO_IRR_RATE = 1_050_000;

/**
 * Formats a price for the active language:
 *  - Persian (`fa`): converts EUR amounts to Iranian Rial and formats with
 *    `fa-IR` — Persian digits, thousands separators, "ریال" suffix, and no
 *    fraction digits (Rial has none). Non-EUR currencies pass through
 *    unconverted.
 *  - English (LTR): keeps the original currency in the European `de-DE`
 *    style ("12,50 €") — matching the original hardcoded formatting.
 */
function formatPrice(amount: number, currency: string, lang: string) {
  if (lang === "fa") {
    const rialAmount = currency === "EUR" ? amount * EUR_TO_IRR_RATE : amount;
    return new Intl.NumberFormat("fa-IR", {
      style: "currency",
      currency: "IRR",
    }).format(rialAmount);
  }
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}
