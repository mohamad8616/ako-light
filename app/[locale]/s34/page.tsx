import ProjectsSections from "@/components/ProjectsSections";
import S34Concept from "@/components/s34/S34Concept";
import S34Harmony from "@/components/s34/S34Harmony";
import S34Hero from "@/components/s34/S34Hero";
import Secuence from "@/components/s34/Secuence";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import { getS34GalleryImages } from "@/lib/data/s34";
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
    path: "/s34",
    title: t["page.s34.title"],
    description: t["page.s34.description"],
  });
}

export default function S34Page() {
  const images = getS34GalleryImages();

  return (
    <main className="bg-background-secondary w-full space-y-48">
      <S34Hero />
      <S34Concept />
      <Secuence />
      <ImageGalleryCarousel
        multiWidth={true}
        mobileColumn={true}
        images={images}
        circle={true}
      />
      <S34Harmony />
      <ProjectsSections />
    </main>
  );
}
