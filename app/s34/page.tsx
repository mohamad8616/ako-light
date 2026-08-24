import S34Approach from "@/components/s34/S34Approach";
import S34Concept from "@/components/s34/S34Concept";
import S34Gallery from "@/components/s34/S34Gallery";
import S34Harmony from "@/components/s34/S34Harmony";
import S34Intro from "@/components/s34/S34Intro";
import S34Location from "@/components/s34/S34Location";
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
      <S34Intro />
      <S34Approach />
      <S34Location />
      <S34Gallery />
      <S34Harmony />
    </main>
  );
}
