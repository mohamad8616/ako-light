"use client";

import Image from "next/image";
import type { MaterialItem } from "@/lib/repositories/material-items";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";

export default function MaterialItemsGrid({ items }: { items: MaterialItem[] }) {
  const { lang } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 px-6 pb-24 sm:grid-cols-3 md:gap-x-8 md:px-12 lg:grid-cols-4 lg:px-20 xl:grid-cols-5 xl:px-[8.5vw]">
      {items.map((item) => (
        <article key={item.id} className="flex min-w-0 flex-col items-center">
          <div className="relative aspect-square w-full overflow-hidden bg-stone-900">
            <Image src={item.image} alt={pick(item.name, lang)} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover" />
          </div>
          <h2 className={cn("mt-4 text-center text-xs font-medium tracking-tight text-white uppercase", lang === "fa" ? "font-noora" : "font-din")}>
            {pick(item.name, lang)}
          </h2>
        </article>
      ))}
    </div>
  );
}
