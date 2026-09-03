import ProjectsSections from "@/components/ProjectsSections";
import S34Concept from "@/components/s34/S34Concept";
import S34Harmony from "@/components/s34/S34Harmony";
import S34Hero from "@/components/s34/S34Hero";
import Secuence from "@/components/s34/Secuence";
import ImageGalleryCarousel from "@/components/ui/ImageGalleryCarousel";

export default function S34Page() {
  return (
    <main className="bg-background-secondary w-full space-y-48">
      <S34Hero />
      <S34Concept />
      <Secuence />
      <ImageGalleryCarousel multiWidth={true} mobileColumn={true} />
      <S34Harmony />
      <ProjectsSections />
    </main>
  );
}
