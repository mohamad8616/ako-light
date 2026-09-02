"use client";

import type { FabricItem } from "@/lib/data/materials";

export default function FabricCard({ fabric }: { fabric: FabricItem }) {
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
    </div>
  );
}
