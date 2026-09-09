import MaterialCategoryView from "@/components/materials/material/MaterialCategoryView";
import { materials } from "@/lib/data/materials";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; material: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { material, locale } = await params;
  const category = materials.find((m) => m.id === material);
  const lang = resolveLocale(locale);
  const t = translations[lang];

  if (!category) {
    // Unknown material slug — generic materials metadata, matching the
    // page's own fallback rendering.
    return buildLocalizedMetadata({
      locale,
      path: `/materials/${material}`,
      title: t["page.materials.title"],
      description: t["page.materials.description"],
    });
  }

  const name = pick(category.name, lang);

  return buildLocalizedMetadata({
    locale,
    path: `/materials/${material}`,
    title: t["page.material.title"].replace("{name}", name),
    description: t["page.material.description"].replace(
      "{name}",
      pick(category.name, lang).toLowerCase(),
    ),
    image: category.image,
  });
}

export default async function MaterialPage({ params }: PageProps) {
  const { material } = await params;
  return <MaterialCategoryView slug={material} />;
}
