import CollectionsHeader from "@/components/collections/CollectionsHeader";
import CollectionsGrid from "@/components/collections/CollectionsList";
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
      t["page.collections.title"],
      t["page.collections.description"],
      absoluteUrl("/collections", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/collections",
    title: t["page.collections.title"],
    description: t["page.collections.description"],
    jsonLd: jsonLdData,
  });
}

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.collections.title"],
      t["page.collections.description"],
      absoluteUrl("/collections", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="w-full bg-background">
        <CollectionsHeader />
        <CollectionsGrid />
      </main>
    </>
  );
}
