import SearchHeader from "@/components/search/SearchHeader";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { Metadata } from "next";
import { cookies } from "next/headers";

// export async function generateMetadata(): Promise<Metadata> {
//   const cookieStore = await cookies();
//   const lang = getLanguageFromCookie(cookieStore.toString());
//   const t = translations[lang];

//   return {
//     title: t["page.search.title"],
//     description: t["page.search.description"],
//   };
// }

export default function DesignersPage() {
  return (
    <main className="bg-background min-h-screen h-auto mt-40 lg:mt-56">
      <SearchHeader />
    </main>
  );
}
