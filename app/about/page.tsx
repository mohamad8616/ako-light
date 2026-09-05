import AboutHero from "@/components/about/AboutHero";
import AboutHeroVideo from "@/components/about/AboutHeroVideo";
import BrandStory from "@/components/about/BrandStory";
import EleganceSection from "@/components/about/EleganceSection";
import ProjectsSections from "@/components/ProjectsSections";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.about.title"],
    description: t["page.about.description"],
  };
}

export default function AboutPage() {
  return (
    <main className="bg-background-secondary w-full space-y-5 sm:space-y-10 md:space-y-12 lg:space-y-14">
      <AboutHero />
      <AboutHeroVideo />
      <BrandStory />
      <ImageGalleryCarousel circle={false} multiWidth={true} mobileColumn={true} />
      {/* <MiddleScreenVideo src="videos/aboutvid.mp4" /> */}
      <EleganceSection />
      <ProjectsSections />
    </main>
  );
}
