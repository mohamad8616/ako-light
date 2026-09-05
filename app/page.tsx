import CatalogueSection from "@/components/home/CatalogueSection";
import HengeParisBanner from "@/components/home/HengeParisBanner";
import HeroSection from "@/components/home/HeroSection";
import HIstraBanner from "@/components/home/HIstraBanner";
import HomeCollectionBanner from "@/components/home/HomeCollectionBanner";
import VideoSection from "@/components/home/VideoSection";
import Vocla2026Section from "@/components/home/Vocla2026Section";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";
import { productCategories } from "@/lib/data/productCategories";
import { getLanguageFromCookie } from "@/lib/i18n/getLanguage";
import { translations } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = getLanguageFromCookie(cookieStore.toString());
  const t = translations[lang];

  return {
    title: t["page.home.title"],
    description: t["page.home.description"],
  };
}

export default function HomePage() {
  const productCategory = productCategories.map((category) => {
    return {
      name: category.i18nKey,
      image: category.products[0].images[0],
      link: category.products[0].slug,
    };
  });
  return (
    <main className="font-noora bg-background-secondary w-full space-y-18 lg:space-y-60">
      <HeroSection />
      <ImageGalleryCarousel category ={productCategory} />
      <HengeParisBanner />
      {/* <HengeLondonBanner /> */}
      <VideoSection />
      <CatalogueSection />
      <HomeCollectionBanner />
      <HIstraBanner />
      <Vocla2026Section />
    </main>
  );
}
