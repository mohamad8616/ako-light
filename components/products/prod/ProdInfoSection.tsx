"use client";

import BuyBtn from "@/components/cart/BuyNowBtn";
import PlusTextBtn from "@/components/ui/PlusTextBtn";
import type { Product } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  productDescription,
  productKey,
  productName,
} from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function ProductInfoSection({ product }: { product: Product }) {
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const { t, lang } = useLanguage();

  return (
    <HomepageSection className="bg-background-secondary h-4/5 py-20 md:py-28">
      <div className="grid h-full grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div className="space-y-6 lg:space-y-10">
          <nav className="font-din flex flex-wrap items-center gap-2 text-xs font-medium tracking-tighter text-stone-500 uppercase">
            <Link
              href="/products"
              className={cn(
                "underline underline-offset-2 transition-colors hover:text-stone-950",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {lang === "fa" ? "محصولات" : "products"}
            </Link>
            <span>/</span>
            <Link
              href={`/products/${product.category}`}
              className={cn(
                "underline underline-offset-2 transition-colors hover:text-stone-600",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {t(productKey(product.category))}
            </Link>
            <span>/</span>
            <span
              className={
                (cn("text-stone-700"),
                lang === "fa" ? "font-noora" : "font-din")
              }
            >
              {productName(t, product.slug)}
            </span>
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
                  className="font-din mt-4 mb-24 max-w-2xl text-sm leading-relaxed text-stone-600"
                >
                  {t("product.moreInfo")}
                </motion.p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-10">
          <div>
            <span
              className={cn(
                "text-xs font-medium tracking-tighter text-stone-500 uppercase",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {t("product.download")}
            </span>
            <div className={cn("mt-4 flex flex-col gap-2 text-sm text-stone-950", lang === "fa" ? "font-noora" : "font-din")}>
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
            <span className={cn("text-xs font-medium tracking-tighter text-stone-500 uppercase", lang === "fa" ? "font-noora" : "font-din")}>
              {t("product.designer")}
            </span>
            <div
              className={cn(
                "mt-4 text-sm text-stone-950",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              <a
                href={product.designer.href}
                className={cn(
                  "w-fit underline underline-offset-2 transition-colors hover:text-stone-600",
                  lang === "fa" ? "font-noora" : "font-din",
                )}
              >
                {product.designer.name}
              </a>
            </div>
            <BuyBtn product={product} />
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
