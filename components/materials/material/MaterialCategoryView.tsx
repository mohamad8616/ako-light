"use client";

import FabricsGrid from "./FabricsGrid";
import MaterialsSwitcher from "./MaterialsSwitcher";
import { materials } from "@/lib/data/materials";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";

// Maps a material's `category` value to a category switcher key, so the
// active category can be highlighted on the detail page. Values not present
// in the switcher are left unhighlighted.
const CATEGORY_TO_KEY: Record<string, string> = {
  Stone: "materials.categories.marbles",
  Metal: "materials.categories.metals",
  Leather: "materials.categories.leathers",
  Wood: "materials.categories.woods",
  Fabrics: "materials.categories.fabrics",
  Fabric: "materials.categories.fabrics",
  Marble: "materials.categories.marbles",
};

// The placeholder material-category routes shown in the switcher dropdown.
const CATEGORY_SLUGS = ["fabrics", "leathers", "woods", "metals", "marbles"];

function isCategorySlug(slug: string): boolean {
  return CATEGORY_SLUGS.includes(slug);
}

// Resolves the page heading for a `/materials/[material]` slug.
function resolveTitle(
  slug: string,
  lang: "en" | "fa",
  t: (key: string) => string,
): string {
  const material = materials.find((m) => m.id === slug);
  if (material) return pick(material.name, lang);
  // Some links point at placeholder category routes (e.g. /materials/fabrics).
  if (isCategorySlug(slug)) return t(`materials.categories.${slug}`);
  return slug;
}

// Resolves the active category key for the switcher, if any.
function resolveActive(slug: string): string | undefined {
  const material = materials.find((m) => m.id === slug);
  if (material) return CATEGORY_TO_KEY[material.category];
  if (isCategorySlug(slug)) return `materials.categories.${slug}`;
  return undefined;
}

export default function MaterialCategoryView({ slug }: { slug: string }) {
  const { t, lang } = useLanguage();
  const title = resolveTitle(slug, lang, t);
  const active = resolveActive(slug);

  return (
    <main className="min-h-screen bg-stone-950 pt-32 md:pt-52">
      <section className="px-6 pb-12 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <span
          className={cn(
            "text-xs font-normal tracking-tighter text-stone-500 uppercase",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {t("materials.title")}
        </span>
        <div className="mt-2 h-px w-full bg-white/15" />

        <div className="mt-6 flex items-start justify-between gap-6 md:mt-8">
          <h1
            className={cn(
              "text-5xl font-bold tracking-tight text-white uppercase md:text-7xl",
              lang === "fa" ? "font-noora" : "font-din",
            )}
          >
            {title}
          </h1>
          <MaterialsSwitcher active={active} />
        </div>

        <p
          className={cn(
            "mt-4 max-w-xl text-sm font-normal tracking-tight text-stone-400 md:mt-6",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {t("materials.previewNote")}
        </p>
      </section>

      <FabricsGrid />
    </main>
  );
}