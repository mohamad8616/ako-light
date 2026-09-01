"use client";

import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, useCartTotal } from "@/lib/cart/store";
import { createCheckout } from "@/lib/cart/checkout";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartSheet({ open, onOpenChange }: Props) {
  const actionsRef = useRef<{ unmount: () => void; close: () => void } | null>(null);
  const items = useCart((state) => state.items);
  const setQuantity = useCart((state) => state.setQuantity);
  const total = useCartTotal();

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
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed");
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
        side="right"
        className="flex flex-col border-0 bg-white p-6 text-stone-950 outline-0"
        motionProps={{
          initial: { x: 400 },
          animate: { x: 0 },
          exit: { opacity: 1, x: 400 },
          transition: { duration: 0.4, ease: "easeInOut" },
        }}
        onExitComplete={() => actionsRef.current?.unmount()}
      >
        <SheetHeader className="p-0 pb-6">
          <SheetTitle className="font-din text-lg font-medium text-stone-950">Cart</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
          {items.length === 0 ? (
            <p className="font-din text-sm text-stone-500">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden bg-stone-100">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-din text-sm font-medium text-stone-950">{item.name}</p>
                      {item.variantLabel && (
                        <p className="font-din text-xs text-stone-500">{item.variantLabel}</p>
                      )}
                    </div>
                    <p className="font-din text-sm text-stone-950">
                      {formatPrice(item.price * item.quantity, item.currency)}
                    </p>
                  </div>
                  <div className="flex w-fit items-center border border-stone-300">
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      aria-label={`Decrease ${item.name} quantity`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-stone-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      aria-label={`Increase ${item.name} quantity`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-stone-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-4 pt-6">
            <div className="flex items-center justify-between border-t border-stone-200 pt-4">
              <span className="font-din text-sm font-medium text-stone-950 uppercase">Total</span>
              <span className="font-din text-sm text-stone-950">
                {formatPrice(total, items[0]?.currency ?? "EUR")}
              </span>
            </div>

            <label className="flex flex-col gap-2">
              <span className="font-din text-xs text-stone-500">Special instructions for seller</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none border border-stone-300 p-2 text-sm outline-none focus:border-stone-950"
              />
            </label>
            <p className="font-din text-xs text-stone-400">
              Shipping and discount codes are added at checkout.
            </p>

            {checkoutError && (
              <p className="font-din text-xs text-red-600">{checkoutError}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="font-din w-full cursor-pointer bg-stone-950 py-3 text-sm font-medium tracking-tight text-white uppercase transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingOut ? "Redirecting…" : "Checkout"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function formatPrice(amount: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency;
  return `${symbol}${amount.toFixed(2).replace(".", ",")}`;
}
