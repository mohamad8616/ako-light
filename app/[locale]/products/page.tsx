import ProductsPageClient from "@/components/products/ProductsPageClient";
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
      t["page.products.title"],
      t["page.products.description"],
      absoluteUrl("/products", lang),
    ),
  ];

  return buildLocalizedMetadata({
    locale,
    path: "/products",
    title: t["page.products.title"],
    description: t["page.products.description"],
    jsonLd: jsonLdData,
  });
}

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = resolveLocale(locale);
  const t = translations[lang];

  const jsonLdData = [
    webPageJsonLd(
      t["page.products.title"],
      t["page.products.description"],
      absoluteUrl("/products", lang),
    ),
  ];

  return (
    <>
      <JsonLdRenderer data={jsonLdData} />
      <ProductsPageClient />
    </>
  );
}
