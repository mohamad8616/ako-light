
import MaterialsHeader from "@/components/materials/MaterialsHeader";
import MaterialsList from "@/components/materials/MaterialsList";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.materials.title"],
    description: t["page.materials.description"],
  };
}

export default function MaterialsPage() {
  return (
    <main className="w-full bg-background">
      <MaterialsHeader />
      <MaterialsList />
    </main>
  );
}