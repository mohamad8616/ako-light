"use client";

import type { MaterialCategory } from "@/lib/repositories/material-categories";
import type { MaterialItem } from "@/lib/repositories/material-items";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import MaterialItemsGrid from "./MaterialItemsGrid";

export default function MaterialCategoryView({
  category,
  items,
}: {
  category: MaterialCategory;
  items: MaterialItem[];
}) {
  const { t, lang } = useLanguage();
  const title = pick(category.name, lang);

  return (
    <main className="min-h-screen bg-stone-950 pt-32 md:pt-52">
      <section className="px-6 pb-12 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <span className={cn("text-xs font-normal tracking-tighter text-stone-500 uppercase", lang === "fa" ? "font-noora" : "font-din")}>
          {t("materials.title")}
        </span>
        <div className="mt-2 h-px w-full bg-white/15" />
        <h1 className={cn("mt-6 text-5xl font-bold tracking-tight text-white uppercase md:mt-8 md:text-7xl", lang === "fa" ? "font-noora" : "font-din")}>
          {title}
        </h1>
        <p className={cn("mt-4 max-w-xl text-sm font-normal tracking-tight text-stone-400 md:mt-6", lang === "fa" ? "font-noora" : "font-din")}>
          {t("materials.previewNote")}
        </p>
      </section>
      <MaterialItemsGrid items={items} />
    </main>
  );
}
