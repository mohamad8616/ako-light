import DesignersHeader from "@/components/designers/DesignersHeader";
import DesignersList from "@/components/designers/DesignersList";
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
    path: "/designers",
    title: t["page.designers.title"],
    description: t["page.designers.description"],
  });
}

export default function DesignersPage() {
  return (
    <main className=" bg-background">
      <DesignersHeader />
      <DesignersList />
    </main>
  );
}
