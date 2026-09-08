import MaterialCategoryView from "@/components/materials/material/MaterialCategoryView";
import { materials } from "@/lib/data/materials";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; material: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { material } = await params;
    const category = materials.find((m) => m.id === material);
  const { locale } = await params;
  const lang = locale as "fa" | "en";
  const t = translations[lang];

  if (!category) {
    return {
      title: t["page.materials.title"],
      description: t["page.materials.description"],
    };
  }

  return {
    title: t["page.material.title"].replace("{name}", pick(category.name, lang)),
    description: t["page.material.description"].replace(
      "{name}",
      pick(category.name, lang).toLowerCase()
    ),
  };
}

export default async function MaterialPage({ params }: PageProps) {
  const { material } = await params;
  return <MaterialCategoryView slug={material} />;
}
