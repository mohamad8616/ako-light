import SearchHeader from "@/components/search/SearchHeader";
import { translations } from "@/lib/i18n/translations";
import { buildLocalizedMetadata, resolveLocale } from "@/lib/seo/metadata";
import { getSearchIndex } from "@/lib/repositories/search-index";
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
  // The SLIM index, not the catalog: `SearchHeader` is a client component, so
  // everything passed to it is serialized into the page payload. Handing it
  // full `Product` records used to ship every description, download link,
  // related-product list, price and image of every product to the browser for
  // a page that only ever matches on names. See lib/repositories/search-index.
  const { products, designers } = await getSearchIndex();

  return (
    <main className="bg-background min-h-screen h-auto mt-40 lg:mt-56">
      <SearchHeader products={products} designers={designers} />
    </main>
  );
}
