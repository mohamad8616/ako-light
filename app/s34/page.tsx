import S34Approach from "@/components/s34/S34Approach";
import S34Concept from "@/components/s34/S34Concept";
import S34Gallery from "@/components/s34/S34Gallery";
import S34Harmony from "@/components/s34/S34Harmony";
import S34Hero from "@/components/s34/S34Hero";
import S34Intro from "@/components/s34/S34Intro";
import S34Location from "@/components/s34/S34Location";

export default function S34Page() {
  return (
    <main className="w-full">
      <S34Hero />
      <S34Intro />
      <S34Approach />
      <S34Location />
      <S34Concept />
      <S34Gallery />
      <S34Harmony />
    </main>
  );
}
