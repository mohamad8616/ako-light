import CatalogueSection from "@/components/home/CatalogueSection";
import HengeLondonBanner from "@/components/home/HengeLondonBanner";
import HengeParisBanner from "@/components/home/HengeParisBanner";
import HeroSection from "@/components/home/HeroSection";
import HIstraBanner from "@/components/home/HIstraBanner";
import HomeCarousel from "@/components/home/HomeCarousel";
import HomeCollectionBanner from "@/components/home/HomeCollectionBanner";
import VideoSection from "@/components/home/VideoSection";
import Vocla2026Section from "@/components/home/Vocla2026Section";

export default function HomePage() {
  return (
    <main className="w-full space-y-18 lg:space-y-60">
      <HeroSection />
      <HomeCarousel />
      <HengeParisBanner />
      <HengeLondonBanner />
      <VideoSection />
      <CatalogueSection />
      <HomeCollectionBanner />
      <HIstraBanner />
      <Vocla2026Section />
    </main>
  );
}
