import CatalogueGrid from "@/components/catalogue/CatalogueGrid";
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
