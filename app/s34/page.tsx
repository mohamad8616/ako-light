import S34Approach from "@/components/s34/S34Approach";
import S34Concept from "@/components/s34/S34Concept";
import S34Harmony from "@/components/s34/S34Harmony";
import Secuence from "@/components/s34/Secuence";
import HeroVideo from "@/components/ui/HeroVideo";

export default function S34Page() {
  return (
    <main className="w-full space-y-48">
      <HeroVideo
        firstLine="S-34"
        secondLine="Via della Spiga 34, Milan"
        btn="play"
        videoSrc="/videos/hero.mp4"
      />
      <S34Concept />
      <Secuence />
      <S34Approach />
      <S34Harmony />
    </main>
  );
}
