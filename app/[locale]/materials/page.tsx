
import MaterialsHeader from "@/components/materials/MaterialsHeader";
import MaterialsList from "@/components/materials/MaterialsList";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { JsonLdRenderer } from "@/lib/seo/JsonLdRenderer";
import { absoluteUrl, webPageJsonLd } from "@/lib/seo/structuredData";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.materials.title"],
      t["page.materials.description"],
      absoluteUrl("/materials", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/materials",
    title: t["page.materials.title"],
    description: t["page.materials.description"],
    jsonLd: jsonLdData,
  });
}

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.materials.title"],
      t["page.materials.description"],
      absoluteUrl("/materials", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="w-full bg-background mt-30 lg:mt-50">
        <MaterialsHeader />
        <MaterialsList />
      </main>
    </>
  );
}