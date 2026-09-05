import CatalogueGrid from "@/components/catalogue/CatalogueGrid";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.catalogue.title"],
    description: t["page.catalogue.description"],
  };
}

export default function Page() {
  return (
    <main className="min-h-screen bg-stone-950 pt-32 md:pt-52">
      <CatalogueGrid />
    </main>
  );
}
