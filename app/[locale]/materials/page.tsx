
import MaterialsHeader from "@/components/materials/MaterialsHeader";
import MaterialsList from "@/components/materials/MaterialsList";
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
    path: "/materials",
    title: t["page.materials.title"],
    description: t["page.materials.description"],
  });
}

export default function MaterialsPage() {
  return (
    <main className="w-full bg-background mt-30 lg:mt-50">
      <MaterialsHeader />
      <MaterialsList />
    </main>
  );
}