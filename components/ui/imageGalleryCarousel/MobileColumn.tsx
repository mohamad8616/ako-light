"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
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
          const alt = hasCategoryCta && cta ? t(cta.name) : "";
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
              key={item.image}
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
                  text={t(cta.name)}
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
