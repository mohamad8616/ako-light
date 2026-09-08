import ProductsPageClient from "@/components/products/ProductsPageClient";
import { translations } from "@/lib/i18n/translations";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as "fa" | "en";
  const t = translations[lang];

  return {
    title: t["page.products.title"],
    description: t["page.products.description"],
  };
}

export default function ProductsPage() {
  return <ProductsPageClient />;
}
