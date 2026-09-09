import MaterialCategoryView from "@/components/materials/material/MaterialCategoryView";
import { materials } from "@/lib/data/materials";
import { pick } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import {
  absoluteUrl,
  breadcrumbListJsonLd,
  webPageJsonLd,
} from "@/lib/seo/structuredData";
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
  const title = t["page.material.title"].replace("{name}", name);
  const description = t["page.material.description"].replace(
    "{name}",
    pick(category.name, lang).toLowerCase(),
  );
  const url = absoluteUrl(`/materials/${material}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const materialsLabel = t["page.materials.title"];

  const jsonLdData = [
    webPageJsonLd(title, description, url),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: materialsLabel, path: "/materials" },
        { name: name, path: `/materials/${material}` },
      ],
      lang,
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: `/materials/${material}`,
    title,
    description,
    image: category.image,
    jsonLd: jsonLdData,
  });
}

export default async function MaterialPage({ params }: PageProps) {
  const { material, locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];
  const category = materials.find((m) => m.id === material);

  if (!category) {
    return <MaterialCategoryView slug={material} />;
  }

  const name = pick(category.name, lang);
  const title = t["page.material.title"].replace("{name}", name);
  const description = t["page.material.description"].replace(
    "{name}",
    pick(category.name, lang).toLowerCase(),
  );
  const url = absoluteUrl(`/materials/${material}`, lang);

  const homeLabel = lang === "fa" ? "خانه" : "Home";
  const materialsLabel = t["page.materials.title"];

  const jsonLdData = [
    webPageJsonLd(title, description, url),
    breadcrumbListJsonLd(
      [
        { name: homeLabel, path: "/" },
        { name: materialsLabel, path: "/materials" },
        { name: name, path: `/materials/${material}` },
      ],
      lang,
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <MaterialCategoryView slug={material} />
    </>
  );
}
