import AboutHero from "@/components/about/AboutHero";
import AboutIntro from "@/components/about/AboutIntro";
import MetaphysicsTeaser from "@/components/about/MetaphysicsTeaser";
import BrandStory from "@/components/about/BrandStory";
import ImageGalleryCarousel from "@/components/about/ImageGalleryCarousel";
import EleganceSection from "@/components/about/EleganceSection";


export default function AboutPage() {
  return (
    <main className="w-full bg-background">
      <AboutHero />
      <AboutIntro />
      <MetaphysicsTeaser />
      <BrandStory />
      <ImageGalleryCarousel />

      <EleganceSection />
    </main>
  );
}
