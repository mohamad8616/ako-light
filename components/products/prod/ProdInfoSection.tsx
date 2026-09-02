"use client";

import PlusTextBtn from "@/components/ui/PlusTextBtn";
import type { Product } from "@/lib/data/productCategories";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { productDescription, productName, productKey } from "@/lib/i18n/localized";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function ProductInfoSection({ product }: { product: Product }) {
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const { t } = useLanguage();


  return (
    <HomepageSection className="bg-background-secondary h-4/5 px-6 py-20 md:px-12 md:py-28 lg:px-20 xl:px-[8.5vw]">
      <div className="grid h-full grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div className="space-y-6 lg:space-y-10">
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
              className="underline underline-offset-2 transition-colors hover:text-stone-600"
            >
              {t(productKey(product.category))}
            </Link>
            <span>/</span>
            <span className="text-stone-700">{productName(t, product.slug)}</span>
          </nav>

          <Paragraph>{productDescription(t, product.slug)}</Paragraph>

          {product.moreInfo && (
            <div className="mt-10">
              <AnimatePresence>
                {!moreInfoOpen && (
                  <motion.div
                    initial={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PlusTextBtn
                      onClick={() => setMoreInfoOpen(!moreInfoOpen)}
                      text={t("product.moreInfoToggle")}
                      textColor="text-background"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {moreInfoOpen && (
                <motion.p
                  initial={{ opacity: 0.6, y: 0 }}
                  animate={{ opacity: 1, y: 90 }}
                  transition={{ duration: 0.8 }}
                  className="font-din mt-4 max-w-2xl text-sm leading-relaxed text-stone-600 mb-24"
                >
                  {t("product.moreInfo")}
                </motion.p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-10">
          <div>
            <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
              {t("product.download")}
            </span>
            <div className="font-din mt-4 flex flex-col gap-2 text-sm text-stone-950">
              {product.downloads.map((d) => (
                <a
                  key={d.label}
                  href={d.href}
                  className="w-fit underline underline-offset-2 transition-colors hover:text-stone-600"
                >
                  {t(d.label)}
                </a>
              ))}
            </div>
          </div>

          <div>
            <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
              {t("product.designer")}
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
    </HomepageSection>
  );
}
