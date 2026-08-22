"use client";

import {
  useWishlist,
  useWishlistHydrated,
  type WishlistItem,
} from "@/lib/whislist/store";
import { HeartIcon } from "lucide-react";

export default function FabricCard({ fabric }: { fabric: WishlistItem }) {
  const hydrated = useWishlistHydrated();
  // Selector subscribes this card to its own saved-state only, so
  // toggling one card's heart doesn't re-render the rest of the grid.
  const isSavedInStore = useWishlist((state) => state.isSaved(fabric.id));
  const toggleItem = useWishlist((state) => state.toggleItem);
  const saved = hydrated && isSavedInStore;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ backgroundColor: fabric.swatchColor }}
      >
        {/* Decorative woven texture — swap this block for a real photo
            <img> / next/image once swatch photography is available. */}
        <div
          className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 5px)",
          }}
        />
      </div>

      <span className="font-din mt-4 text-xs font-medium tracking-tighter text-white uppercase">
        {fabric.name}
      </span>

      <button
        onClick={() => toggleItem(fabric)}
        aria-label={
          saved ? `Remove ${fabric.name} from saved` : `Save ${fabric.name}`
        }
        aria-pressed={saved}
        className="mt-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 transition-colors duration-200 hover:border-white/50 focus:outline-none"
      >
        <HeartIcon
          size={14}
          strokeWidth={2}
          className="text-white"
          fill={saved ? "white" : "none"}
        />
      </button>
    </div>
  );
}
