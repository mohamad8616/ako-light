import AboutHero from "@/components/about/AboutHero";
import AboutHeroVideo from "@/components/about/AboutHeroVideo";
import AboutIntro from "@/components/about/AboutIntro";
import BrandStory from "@/components/about/BrandStory";
import EleganceSection from "@/components/about/EleganceSection";
import ImageGalleryCarousel from "@/components/about/ImageGalleryCarousel";

export default function AboutPage() {
  return (
    <main className="w-full bg-background">
      <AboutHero />
      <AboutHeroVideo />
      <AboutIntro />
      <BrandStory />
      <ImageGalleryCarousel />

      <EleganceSection />
    </main>
  );
}
