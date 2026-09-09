import FlagshipHeader from "@/components/flagship/FlagshipHeader";
import FlagshipList from "@/components/flagship/FlagshipList";
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
      t["page.flagships.title"],
      t["page.flagships.description"],
      absoluteUrl("/flagship", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/flagship",
    title: t["page.flagships.title"],
    description: t["page.flagships.description"],
    jsonLd: jsonLdData,
  });
}

export default async function FlagshipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.flagships.title"],
      t["page.flagships.description"],
      absoluteUrl("/flagship", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <main className="w-full bg-background">
        <FlagshipHeader />
        <FlagshipList />
      </main>
    </>
  );
}
