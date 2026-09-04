"use client";

import type { FlagshipWithDetail } from "@/lib/data/flagships";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function FlagshipGallerySection({ flagship }: { flagship: FlagshipWithDetail }) {
  const { t, lang } = useLanguage();
  const name = pick(flagship.name, lang);
  return (
    <section className="bg-stone-100 px-6 pb-20 md:px-12 md:pb-28 lg:px-20 xl:px-[8.5vw]">
      <span
        className={cn(
          "text-xs font-medium tracking-tighter text-stone-500 uppercase",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {t("ui.imageGallery")}
      </span>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flagship.gallery.map((src, i) => (
          <div key={i} className="relative aspect-square w-full overflow-hidden">
            <Image
              src={src}
              alt={`${name} gallery ${i + 1}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
