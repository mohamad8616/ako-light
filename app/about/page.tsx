import AboutHero from "@/components/about/AboutHero";
import AboutHeroVideo from "@/components/about/AboutHeroVideo";
import AfterCarouselVid from "@/components/about/AfterCarouselVid";
import BrandStory from "@/components/about/BrandStory";
import EleganceSection from "@/components/about/EleganceSection";
import ImageGalleryCarousel from "@/components/about/ImageGalleryCarousel";
import ProjectsSections from "@/components/about/ProjectsSections";

export default function AboutPage() {
  return (
    <main className="bg-background-secondary w-full space-y-5 sm:space-y-10 md:space-y-12 lg:space-y-14">
      <AboutHero />
      <AboutHeroVideo />
      <BrandStory />
      <ImageGalleryCarousel />
      <AfterCarouselVid />
      <EleganceSection />
      <ProjectsSections />
    </main>
  );
}
