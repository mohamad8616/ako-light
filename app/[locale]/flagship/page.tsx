import FlagshipHeader from "@/components/flagship/FlagshipHeader";
import FlagshipList from "@/components/flagship/FlagshipList";
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
    path: "/flagship",
    title: t["page.flagships.title"],
    description: t["page.flagships.description"],
  });
}

export default function Page() {
  return (
    <main className="w-full bg-background">
      <FlagshipHeader />
      <FlagshipList />
    </main>
  );
}
