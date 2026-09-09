import CatalogueSection from "@/components/home/CatalogueSection";
import HengeParisBanner from "@/components/home/HengeParisBanner";
import HeroSection from "@/components/home/HeroSection";
import HIstraBanner from "@/components/home/HIstraBanner";
import HomeCollectionBanner from "@/components/home/HomeCollectionBanner";
import VideoSection from "@/components/home/VideoSection";
import Vocla2026Section from "@/components/home/Vocla2026Section";
import ImageGalleryCarousel from "@/components/ui/imageGalleryCarousel";
import { productCategories } from "@/lib/data/productCategories";
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
    path: "/",
    title: t["page.home.title"],
    description: t["page.home.description"],
    // The home title already carries the brand — no template suffix.
    absoluteTitle: true,
  });
}

export default function HomePage() {
  const productCategory = productCategories.map((category) => {
    return {
      name: category.i18nKey,
      image: category.products[0].images[0],
      link: `/products/${category.slug}`,
    };
  });
  return (
    <main className="font-noora bg-background-secondary w-full space-y-18 lg:space-y-60">
      <HeroSection />
      <ImageGalleryCarousel purpose="link" category={productCategory} />
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
