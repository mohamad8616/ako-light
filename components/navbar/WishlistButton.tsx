"use client";

import { HeartIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useWishlist, useWishlistHydrated } from "@/lib/wishlist/store";

export default function WishlistButton() {
  const hydrated = useWishlistHydrated();
  const items = useWishlist((state) => state.items);
  const removeItem = useWishlist((state) => state.removeItem);

  // The "special heart" only appears once the first item is saved, and
  // not before the client has loaded localStorage (avoids a hydration
  // mismatch — see useWishlistHydrated).
  if (!hydrated || items.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger
        aria-label={`Saved materials (${items.length})`}
        className="relative cursor-pointer text-white transition-all duration-300 hover:opacity-70 focus:outline-none"
      >
        <HeartIcon size={18} strokeWidth={2.2} fill="white" />
        <span className="font-din absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-medium text-stone-950">
          {items.length}
        </span>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="border-0 bg-stone-950 p-6 text-white outline-0"
        motionProps={{
          initial: { x: "100%" },
          animate: { x: "0%" },
          exit: { x: "100%" },
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        <SheetHeader className="p-0 pb-6">
          <SheetTitle className="font-din text-sm font-normal tracking-tighter text-white uppercase">
            Saved Materials ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="font-din text-xs tracking-tighter text-stone-500 uppercase">
            Nothing saved yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border-b border-white/10 pb-4"
              >
                <div
                  className="h-14 w-14 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.swatchColor }}
                />
                <div className="flex flex-1 flex-col">
                  <span className="font-din text-xs font-normal tracking-tighter text-white uppercase">
                    {item.name}
                  </span>
                  <span className="font-din text-[11px] tracking-tighter text-stone-400 uppercase">
                    {item.code} · {item.category}
                  </span>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name} from saved`}
                  className="font-din cursor-pointer text-[11px] tracking-tighter text-stone-400 uppercase transition-colors hover:text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
