import ProjectsSections from "@/components/ProjectsSections";
import S34Concept from "@/components/s34/S34Concept";
import S34Harmony from "@/components/s34/S34Harmony";
import S34Hero from "@/components/s34/S34Hero";
import Secuence from "@/components/s34/Secuence";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.s34.title"],
    description: t["page.s34.description"],
  };
}

export default function S34Page() {
  return (
    <main className="bg-background-secondary w-full space-y-48">
      <S34Hero />
      <S34Concept />
      <Secuence />
      <ImageGalleryCarousel multiWidth={true} mobileColumn={true} />
      <S34Harmony />
      <ProjectsSections />
    </main>
  );
}
