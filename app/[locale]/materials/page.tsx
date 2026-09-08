
import MaterialsHeader from "@/components/materials/MaterialsHeader";
import MaterialsList from "@/components/materials/MaterialsList";
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
    title: t["page.materials.title"],
    description: t["page.materials.description"],
  };
}

export default function MaterialsPage() {
  return (
    <main className="w-full bg-background mt-30 lg:mt-50">
      <MaterialsHeader />
      <MaterialsList />
    </main>
  );
}