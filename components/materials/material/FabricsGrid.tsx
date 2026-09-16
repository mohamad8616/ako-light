"use client";

import type { FabricItem } from "@/lib/data/materials";
import FabricCard from "./FabricCard";

export default function FabricsGrid({ fabrics }: { fabrics: FabricItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 px-6 pb-24 sm:grid-cols-3 md:gap-x-8 md:px-12 lg:grid-cols-4 lg:px-20 xl:grid-cols-5 xl:px-[8.5vw]">
      {fabrics.map((fabric) => (
        <FabricCard key={fabric.id} fabric={fabric} />
      ))}
    </div>
  );
}
