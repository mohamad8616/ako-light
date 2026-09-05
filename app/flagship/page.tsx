import FlagshipHeader from "@/components/flagship/FlagshipHeader";
import FlagshipList from "@/components/flagship/FlagshipList";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.flagships.title"],
    description: t["page.flagships.description"],
  };
}

export default function Page() {
  return (
    <main className="w-full bg-background">
      <FlagshipHeader />
      <FlagshipList />
    </main>
  );
}
