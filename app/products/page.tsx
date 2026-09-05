import ProductsPageClient from "@/components/products/ProductsPageClient";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.products.title"],
    description: t["page.products.description"],
  };
}

export default function ProductsPage() {
  return <ProductsPageClient />;
}
