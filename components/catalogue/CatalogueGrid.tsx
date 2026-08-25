import { catalogueItems } from "@/lib/data/catalogue";
import CatalogueCard from "./CatalogueCard";

export default function CatalogueGrid() {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-12 px-6 pb-24 sm:grid-cols-2 md:gap-x-6 md:px-12 lg:grid-cols-3 lg:px-20 xl:px-[8.5vw]">
      {catalogueItems.map((item) => (
        <CatalogueCard key={item.id} item={item} />
      ))}
    </div>
  );
}
