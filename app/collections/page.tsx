import CollectionsHeader from "@/components/collections/CollectionsHeader";
import CollectionsGrid from "@/components/collections/CollectionsList";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
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
