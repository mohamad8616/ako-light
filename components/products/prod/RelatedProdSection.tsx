"use client";
import PlusTextBtn from "@/components/ui/PlusTextBtn";
import type { Product, RelatedProduct } from "@/lib/data/productCategories";
import { products } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { productName } from "@/lib/i18n/localized";
import HomepageSection, { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

function getRelatedProducts(product: Product): RelatedProduct[] {
  const sameCategory = products.filter(
    (p) => p.category === product.category && p.slug !== product.slug,
  );

  const seed = product.slug
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shuffled = [...sameCategory];
  let random = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    random = (random * 1103515245 + 12345) & 0x7fffffff;
    const j = random % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, 3).map((p) => ({
    name: p.name,
    slug: p.slug,
    category: p.category,
    image: p.heroImage,
  }));
}

export default function RelatedProductsSection({
  product,
}: {
  product: Product;
}) {
  const { t } = useLanguage();
  const related = getRelatedProducts(product);

  return (
    <HomepageSection>
      <div className="bg-background-secondary m flex min-h-screen items-center justify-center py-20">
        <div className="grid w-full grid-cols-1 items-center justify-between gap-20 sm:grid-cols-3 md:mt-20 md:gap-20">
          <span className="font-din col-span-full text-xs font-medium tracking-tighter text-stone-700 uppercase">
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
                <Image
                  src={item.image}
                  alt={productName(t, item.slug)}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/40" />
              </Link>
              <PlusTextBtn
                text={productName(t, item.slug)}
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
