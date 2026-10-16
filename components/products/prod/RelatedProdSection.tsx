"use client";
import PlusTextBtn from "@/components/ui/PlusTextBtn";
import type { Product, RelatedProduct } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { Language } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import HomepageSection, { EASE } from "@/utility/HomepageSection";
import { imageZoomClass } from "@/utility/animations";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "@/lib/i18n/Link";

/**
 * The three related products to display.
 *
 * ── Curated first, derived second ───────────────────────────────────────────
 *
 * The admin picks related products explicitly (the "related" field on the
 * product form) and those picks are stored as a denormalized snapshot on
 * `Product.related` — see prisma `Product.related` and the note in
 * `ProductsUsedField`. That column is the SOURCE OF TRUTH: if the operator
 * curated a set, we render exactly it, in their order.
 *
 * Only when the column is EMPTY do we derive a set, so the section is never
 * blank on a product nobody has curated yet. The derivation is a seeded
 * shuffle of the same category (a stable "random" per product slug), then
 * other-category products as a last resort for a category with a single
 * product — which would otherwise render an empty strip.
 */
function resolveRelated(
  product: Product,
  sameCategoryProducts: Product[],
): RelatedProduct[] {
  // 1. Curated — the admin's explicit picks win, in their order.
  if (product.related.length > 0) {
    return product.related.slice(0, 3);
  }

  // 2. Derived — a deterministic shuffle of the same category, so the strip is
  //    populated before anyone curates it. Seeded by the slug so the order is
  //    stable across renders (a plain Math.random would reshuffle on hydration
  //    and trip a mismatch).
  const seed = product.slug
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shuffled = [...sameCategoryProducts];
  let random = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    random = (random * 1103515245 + 12345) & 0x7fffffff;
    const j = random % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, 3).map(toRelatedProduct);
}

/** A full `Product` reduced to the fields the card renders. */
function toRelatedProduct(product: Product): RelatedProduct {
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    image: product.heroImage,
  };
}

export default function RelatedProductsSection({
  product,
  sameCategoryProducts,
}: {
  product: Product;
  sameCategoryProducts: Product[];
}) {
  const { t, lang } = useLanguage();
  const related = resolveRelated(product, sameCategoryProducts);

  // Nothing to show: an uncurated product with no siblings. Rendering the
  // heading over an empty grid is worse than rendering nothing.
  if (related.length === 0) return null;

  return (
    <HomepageSection>
      <div className="bg-background-secondary m flex min-h-screen items-center justify-center py-20">
        <div className="grid w-full grid-cols-1 items-center justify-between gap-20 sm:grid-cols-3 md:mt-20 md:gap-20">
          <span
            className={cn(
              "col-span-full text-xs font-medium tracking-tighter text-stone-700 uppercase",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {t("products.relatedTitle")}
          </span>
          {related.map((item, i) => (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
            >
              <Link
                href={`/products/${item.category}/${item.slug}`}
                className="group relative mb-5 grid aspect-square w-full grid-cols-1 overflow-hidden lg:mb-0"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={relatedName(item, t, lang)}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className={imageZoomClass({ scale: 105 })}
                  />
                ) : null}
                <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/40" />
              </Link>
              <PlusTextBtn
                text={relatedName(item, t, lang)}
                className="text-background mt-10 lg:mt-5"
                textColor="text-background"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}

/**
 * The name to show for a related card.
 *
 * A curated snapshot carries its own `name`; a derived row carries the full
 * `Product` name. Both are `Localized` pairs, so `pick` resolves the active
 * language and a blank result falls back to the other locale then the slug —
 * never an empty label.
 */
function relatedName(
  item: RelatedProduct,
  t: (key: string) => string,
  lang: string,
): string {
  return (
    pick(item.name, lang as Language).trim() ||
    item.name.en.trim() ||
    item.slug
  );
}
