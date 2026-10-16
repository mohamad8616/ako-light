"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { displayCategoryName } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "@/lib/i18n/Link";
import PlusTextBtn from "../PlusTextBtn";
import { IMAGE_TRANSITION, OVERLAY_TRANSITION } from "./constants";
import { isCategoryItem } from "./helpers";
import type { CarouselItem, CarouselPurpose } from "./types";

type Props = {
  items: CarouselItem[];
  purpose: CarouselPurpose;
  href?: string;
  onOpen: (index: number) => void;
};

/** Picks `font-noora` for Persian, `font-din` otherwise. */
const fontForLang = (lang: "en" | "fa") =>
  lang === "fa" ? "font-noora" : "font-din";

/**
 * Stacked column shown on small viewports (hidden on `lg+`). Same
 * click semantics as the carousel: `"link"` mode → anchor; otherwise a
 * button that calls `onOpen(index)`.
 */
export default function MobileColumn({ items, purpose, href, onOpen }: Props) {
  const { lang, t } = useLanguage();
  const hasCategoryCta = items.some(isCategoryItem);
  const fontClass = fontForLang(lang);

  return (
    <div className="mx-auto block lg:hidden">
      <div className="grid grid-cols-1 gap-2">
        {items.map((item, i) => {
          const cta = isCategoryItem(item) ? item : null;
          // Dictionary-first, column fallback — see `displayCategoryName`.
          // Calling `t()` on `cta.name` is what rendered the raw key
          // ("products.car") for a category with no dictionary entry yet.
          const alt =
            hasCategoryCta && cta ? displayCategoryName(t, cta, lang) : "";
          const slideHref =
            purpose === "link" ? (item.link ?? href) : undefined;

          const imageBlock = (
            <div className="relative aspect-video w-full overflow-hidden bg-[#111]">
              <Image
                src={item.image}
                alt={alt}
                fill
                sizes="100vw"
                className={cn("object-cover", IMAGE_TRANSITION)}
              />
              <div
                className={cn(
                  "absolute inset-0 bg-black/0",
                  OVERLAY_TRANSITION,
                )}
              />
            </div>
          );

          return (
            <motion.div
              // Position + identifier, never the image alone — two slides may
              // share an image (or have none), which made the key non-unique.
              // The identifier is the link for category tiles (their slug path)
              // — `name` is a bilingual object, so it is never stringified here.
              key={`${i}:${item.link ?? item.image ?? item.i18nKey ?? ""}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="group flex w-full flex-col items-center justify-start gap-5"
            >
              {slideHref ? (
                <Link
                  href={slideHref}
                  aria-label={alt || undefined}
                  className="w-full"
                >
                  {imageBlock}
                </Link>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(i);
                    }
                  }}
                  className="w-full cursor-pointer"
                >
                  {imageBlock}
                </div>
              )}
              {cta && (
                <PlusTextBtn
                  text={displayCategoryName(t, cta, lang)}
                  href={cta.link}
                  className={fontClass}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
