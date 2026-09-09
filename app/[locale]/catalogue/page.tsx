import CatalogueGrid from "@/components/catalogue/CatalogueGrid";
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
      t["page.catalogue.title"],
      t["page.catalogue.description"],
      absoluteUrl("/catalogue", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/catalogue",
    title: t["page.catalogue.title"],
    description: t["page.catalogue.description"],
    jsonLd: jsonLdData,
  });
}

export default async function CataloguePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.catalogue.title"],
      t["page.catalogue.description"],
      absoluteUrl("/catalogue", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="min-h-screen bg-stone-950 pt-32 md:pt-52">
        <CatalogueGrid />
      </main>
    </>
  );
}
