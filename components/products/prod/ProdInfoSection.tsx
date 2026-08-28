"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Minus } from "lucide-react";
import type { Product } from "@/lib/data/prods";

export default function ProductInfoSection({ product }: { product: Product }) {
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);

  return (
    <section className="bg-stone-100 px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-[8.5vw]">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div>
          <nav className="font-din flex flex-wrap items-center gap-2 text-xs font-medium tracking-tighter text-stone-500 uppercase">
            <Link
              href="/products"
              className="underline underline-offset-2 transition-colors hover:text-stone-950"
            >
              Products
            </Link>
            <span>/</span>
            <Link
              href={`/products/${product.category}`}
              className="underline underline-offset-2 transition-colors hover:text-stone-950"
            >
              {product.categoryLabel}
            </Link>
            <span>/</span>
            <span className="text-stone-950">{product.name}</span>
          </nav>

          <p className="font-din mt-8 max-w-2xl text-base leading-relaxed text-stone-700">
            {product.description}
          </p>

          {product.moreInfo && (
            <div className="mt-10">
              <button
                onClick={() => setMoreInfoOpen((prev) => !prev)}
                aria-expanded={moreInfoOpen}
                className="font-din flex cursor-pointer items-center gap-2 text-xs font-medium tracking-tighter text-stone-950 uppercase"
              >
                {moreInfoOpen ? (
                  <Minus size={12} strokeWidth={2.5} />
                ) : (
                  <Plus size={12} strokeWidth={2.5} />
                )}
                More info
              </button>

              {moreInfoOpen && (
                <p className="font-din mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
                  {product.moreInfo}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-10">
          <div>
            <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
              Download
            </span>
            <div className="font-din mt-4 flex flex-col gap-2 text-sm text-stone-950">
              {product.downloads.map((d) => (
                <a
                  key={d.label}
                  href={d.href}
                  className="w-fit underline underline-offset-2 transition-colors hover:text-stone-600"
                >
                  {d.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
              Designer
            </span>
            <div className="font-din mt-4 text-sm text-stone-950">
              <a
                href={product.designer.href}
                className="w-fit underline underline-offset-2 transition-colors hover:text-stone-600"
              >
                {product.designer.name}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
