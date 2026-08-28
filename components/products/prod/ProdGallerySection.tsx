"use client";

import useEmblaCarousel from "embla-carousel-react";
import type { Product } from "@/lib/data/prods";

export default function ProductGallerySection({ product }: { product: Product }) {
  // Same bare options as your existing S34Gallery carousel — add your
  // own transition/plugin setup on top of this later.
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
    loop: false,
  });

  return (
    <section className="bg-stone-100 pb-20 md:pb-28">
      <div className="px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
          Image Gallery
        </span>
      </div>

      <div
        ref={emblaRef}
        className="no-scrollbar mt-8 cursor-grab overflow-hidden active:cursor-grabbing"
      >
        <div className="flex gap-4 px-6 md:gap-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
          {product.gallery.map((src, i) => (
            <div
              key={src}
              className="relative aspect-4/5 w-[75vw] shrink-0 overflow-hidden bg-[#111] sm:w-[50vw] md:w-[38vw] lg:w-[28vw] xl:w-[24vw]"
            >
              <img
                src={src}
                alt={`${product.name} ${i + 1}`}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
