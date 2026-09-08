import CollectionsHeader from "@/components/collections/CollectionsHeader";
import CollectionsGrid from "@/components/collections/CollectionsList";
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
    title: t["page.collections.title"],
    description: t["page.collections.description"],
  };
}

export default function CollectionsPage() {
  return (
    <main className="w-full bg-background">
      <CollectionsHeader />
      <CollectionsGrid />
    </main>
  );
}
