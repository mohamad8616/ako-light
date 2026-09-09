import ProductsPageClient from "@/components/products/ProductsPageClient";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = translations[resolveLocale(locale)];

  return buildLocalizedMetadata({
    locale,
    path: "/products",
    title: t["page.products.title"],
    description: t["page.products.description"],
  });
}

export default function ProductsPage() {
  return <ProductsPageClient />;
}
