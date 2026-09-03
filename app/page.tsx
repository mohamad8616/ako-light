import CatalogueSection from "@/components/home/CatalogueSection";
import HengeLondonBanner from "@/components/home/HengeLondonBanner";
import HengeParisBanner from "@/components/home/HengeParisBanner";
import HeroSection from "@/components/home/HeroSection";
import HIstraBanner from "@/components/home/HIstraBanner";
import HomeCollectionBanner from "@/components/home/HomeCollectionBanner";
import VideoSection from "@/components/home/VideoSection";
import Vocla2026Section from "@/components/home/Vocla2026Section";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";

export default function HomePage() {
  return (
    <main className="w-full space-y-18 lg:space-y-60 font-noora bg-background-secondary">
      <HeroSection />
      <ImageGalleryCarousel />
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
