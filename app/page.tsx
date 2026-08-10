import HeroSection from "@/components/home/HeroSection";
import SliderSection from "@/components/home/SliderSection";
import TimelessTablesBanner from "@/components/home/TimelessTablesBanner";
import HengeParisBanner from "@/components/home/HengeParisBanner";
import VideoSection from "@/components/home/VideoSection";
import CatalogueSection from "@/components/home/CatalogueSection";
import HomeCollectionBanner from "@/components/home/HomeCollectionBanner";
import HIstraBanner from "@/components/home/HIstraBanner";
import Vocla2026Section from "@/components/home/Vocla2026Section";
import HomeCarousel from "@/components/home/HomeCarousel";

export default function HomePage() {
  return (
    <main className="w-full">
      <HeroSection />
      <SliderSection />
      <TimelessTablesBanner />
      <HengeParisBanner />
      <VideoSection />
      <CatalogueSection />
      <HomeCollectionBanner />
      <HIstraBanner />
      <Vocla2026Section />
      <HomeCarousel />
    </main>
  );
}