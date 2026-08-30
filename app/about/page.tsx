import AboutHeroVideo from "@/components/about/AboutHeroVideo";
import BrandStory from "@/components/about/BrandStory";
import EleganceSection from "@/components/about/EleganceSection";
import ProjectsSections from "@/components/ProjectsSections";
import HeroVideo from "@/components/ui/HeroVideo";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";

export default function AboutPage() {
  return (
    <main className="bg-background-secondary w-full space-y-5 sm:space-y-10 md:space-y-12 lg:space-y-14">
      <HeroVideo
        firstLine="The Metaphysics of Beauty"
        secondLine="Henge&rsquo;s world is incredibly rich of unique materials"
        btn="play"
        videoSrc="/videos/hero.mp4"
      />
      <AboutHeroVideo />
      <BrandStory />
      <ImageGalleryCarousel circle={false} multiWidth={true} mobileColumn={true} />
      {/* <MiddleScreenVideo src="videos/aboutvid.mp4" /> */}
      <EleganceSection />
      <ProjectsSections />
    </main>
  );
}
