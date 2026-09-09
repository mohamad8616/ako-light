import DesignersHeader from "@/components/designers/DesignersHeader";
import DesignersList from "@/components/designers/DesignersList";
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
      t["page.designers.title"],
      t["page.designers.description"],
      absoluteUrl("/designers", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/designers",
    title: t["page.designers.title"],
    description: t["page.designers.description"],
    jsonLd: jsonLdData,
  });
}

export default async function DesignersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.designers.title"],
      t["page.designers.description"],
      absoluteUrl("/designers", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className=" bg-background">
        <DesignersHeader />
        <DesignersList />
      </main>
    </>
  );
}
