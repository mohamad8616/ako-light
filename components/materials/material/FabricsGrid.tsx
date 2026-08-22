"use client";

import FabricCard from "./FabricCard";
import type { WishlistItem } from "@/lib/wishlist/store";

// Placeholder library matching the reference screenshot's naming/coloring —
// swap swatchColor for a real photo source per fabric once photography is
// available (see FabricCard).
const FABRICS: WishlistItem[] = [
  { id: "abarth-26", name: "Abarth 26", code: "26", category: "Fabrics", swatchColor: "#726A50" },
  { id: "abarth-25", name: "Abarth 25", code: "25", category: "Fabrics", swatchColor: "#D89B2A" },
  { id: "abarth-24", name: "Abarth 24", code: "24", category: "Fabrics", swatchColor: "#D9C7A8" },
  { id: "abarth-23", name: "Abarth 23", code: "23", category: "Fabrics", swatchColor: "#3B2E22" },
  { id: "abarth-22", name: "Abarth 22", code: "22", category: "Fabrics", swatchColor: "#8C6F63" },
  { id: "abarth-21", name: "Abarth 21", code: "21", category: "Fabrics", swatchColor: "#5C5240" },
  { id: "abarth-20", name: "Abarth 20", code: "20", category: "Fabrics", swatchColor: "#C7A560" },
  { id: "abarth-19", name: "Abarth 19", code: "19", category: "Fabrics", swatchColor: "#E3D5B8" },
  { id: "abarth-18", name: "Abarth 18", code: "18", category: "Fabrics", swatchColor: "#4A362A" },
  { id: "abarth-17", name: "Abarth 17", code: "17", category: "Fabrics", swatchColor: "#9C7A6A" },
];

export default function FabricsGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 px-6 pb-24 sm:grid-cols-3 md:gap-x-8 md:px-12 lg:grid-cols-4 lg:px-20 xl:grid-cols-5 xl:px-[8.5vw]">
      {FABRICS.map((fabric) => (
        <FabricCard key={fabric.id} fabric={fabric} />
      ))}
    </div>
  );
}
