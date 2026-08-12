import CatalogueSection from "@/components/home/CatalogueSection";
import HengeParisBanner from "@/components/home/HengeParisBanner";
import HeroSection from "@/components/home/HeroSection";
import HIstraBanner from "@/components/home/HIstraBanner";
import HomeCarousel from "@/components/home/HomeCarousel";
import HomeCollectionBanner from "@/components/home/HomeCollectionBanner";
import SliderSection from "@/components/home/SliderSection";
import TimelessTablesBanner from "@/components/home/TimelessTablesBanner";
import VideoSection from "@/components/home/VideoSection";
import Vocla2026Section from "@/components/home/Vocla2026Section";

export default function HomePage() {
  return (
    <main className="w-full">
      <HeroSection />
      <HomeCarousel />
      <HengeParisBanner />
      <CatalogueSection />
      <SliderSection />
      <TimelessTablesBanner />
      <VideoSection />
      <HomeCollectionBanner />
      <Vocla2026Section />
      <HIstraBanner />
    </main>
  );
}
