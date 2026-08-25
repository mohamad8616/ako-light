import type { CatalogueItem } from "@/lib/data/catalogue";

export default function CatalogueCard({ item }: { item: CatalogueItem }) {
  return (
    <div className="flex flex-col">
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        download
        aria-label={`Download ${item.title} catalogue`}
        className="group relative block aspect-square w-full overflow-hidden"
        style={{ backgroundColor: item.coverColor }}
      >
        {/* Placeholder cover — swap for real catalogue photography */}
        <span
          className="font-din absolute inset-0 flex items-center justify-center px-4 text-center text-3xl font-bold tracking-tighter uppercase transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 md:text-4xl"
          style={{ color: item.coverTextColor ?? "#ffffff" }}
        >
          {item.title}
        </span>
      </a>

      <span className="font-din mt-4 text-sm font-medium tracking-tighter text-white uppercase">
        {item.title}
      </span>
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="font-din mt-1 w-fit text-xs tracking-tighter text-stone-500 uppercase transition-colors hover:text-white"
      >
        Download
      </a>
    </div>
  );
}
