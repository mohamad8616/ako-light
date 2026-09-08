import DesignersHeader from "@/components/designers/DesignersHeader";
import DesignersList from "@/components/designers/DesignersList";
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
