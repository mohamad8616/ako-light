import CollectionsHeader from "@/components/collections/CollectionsHeader";
import CollectionsGrid from "@/components/collections/CollectionsList";
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
    path: "/collections",
    title: t["page.collections.title"],
    description: t["page.collections.description"],
  });
}

export default function CollectionsPage() {
  return (
    <main className="w-full bg-background">
      <CollectionsHeader />
      <CollectionsGrid />
    </main>
  );
}
