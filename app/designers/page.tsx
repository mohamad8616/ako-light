import DesignersHeader from "@/components/designers/DesignersHeader";
import DesignersList from "@/components/designers/DesignersList";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.designers.title"],
    description: t["page.designers.description"],
  };
}

export default function DesignersPage() {
  return (
    <main className=" bg-background">
      <DesignersHeader />
      <DesignersList />
    </main>
  );
}
