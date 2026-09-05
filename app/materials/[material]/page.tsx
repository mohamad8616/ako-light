import MaterialCategoryView from "@/components/materials/material/MaterialCategoryView";
import { materials } from "@/lib/data/materials";
import { pick } from "@/lib/i18n/localized";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ material: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { material } = await params;
    const category = materials.find((m) => m.id === material);
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
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
