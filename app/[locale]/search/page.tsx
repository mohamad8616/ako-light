import SearchHeader from "@/components/search/SearchHeader";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { getDesigners } from "@/lib/repositories/designers";
import { getProducts } from "@/lib/repositories/products";
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
    path: "/search",
    title: t["page.search.title"],
    description: t["page.search.description"],
    // Internal search interface: keep it crawlable but out of the index.
    noindex: true,
  });
}

export default async function DesignersPage() {
  const [products, designers] = await Promise.all([
    getProducts(),
    getDesigners(),
  ]);

  return (
    <main className="bg-background min-h-screen h-auto mt-40 lg:mt-56">
      <SearchHeader products={products} designers={designers} />
    </main>
  );
}
