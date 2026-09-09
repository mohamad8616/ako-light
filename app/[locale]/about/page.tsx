import AboutHero from "@/components/about/AboutHero";
import AboutHeroVideo from "@/components/about/AboutHeroVideo";
import BrandStory from "@/components/about/BrandStory";
import EleganceSection from "@/components/about/EleganceSection";
import ProjectsSections from "@/components/ProjectsSections";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import { getAboutGalleryImages } from "@/lib/data/about";
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
    path: "/about",
    title: t["page.about.title"],
    description: t["page.about.description"],
  });
}
const images = getAboutGalleryImages();
export default function AboutPage() {
  return (
    <main className="bg-background-secondary w-full space-y-5 sm:space-y-10 md:space-y-12 lg:space-y-14">
      <AboutHero />
      <AboutHeroVideo />
      <BrandStory />
      <ImageGalleryCarousel
        circle={true}
        multiWidth={true}
        mobileColumn={true}
        images={images}
      />
      <EleganceSection />
      <ProjectsSections />
    </main>
  );
}
