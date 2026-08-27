import type { FlagshipWithDetail } from "@/lib/data/flagships";

export default function FlagshipGallerySection({ flagship }: { flagship: FlagshipWithDetail }) {
  return (
    <section className="bg-stone-100 px-6 pb-20 md:px-12 md:pb-28 lg:px-20 xl:px-[8.5vw]">
      <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
        Image Gallery
      </span>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flagship.gallery.map((src, i) => (
          <div key={src} className="relative aspect-square w-full overflow-hidden">
            <img
              src={src}
              alt={`${flagship.name} gallery ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
