import Link from "next/link";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/data/prods";

export default function RelatedProductsSection({ product }: { product: Product }) {
  if (product.related.length === 0) return null;

  return (
    <section className="bg-stone-100 px-6 pb-20 md:px-12 md:pb-28 lg:px-20 xl:px-[8.5vw]">
      <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
        You may also like
      </span>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {product.related.map((item) => (
          <Link
            key={item.slug}
            href={`/products/${item.category}/${item.slug}`}
            className="group flex flex-col"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black">
              <img
                src={item.image}
                alt={item.name}
                className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <span className="font-din mt-4 flex items-center gap-2 text-xs font-medium tracking-tighter text-stone-950 uppercase">
              <Plus size={12} strokeWidth={2.5} />
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
