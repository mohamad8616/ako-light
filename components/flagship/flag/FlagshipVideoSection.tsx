import { Play } from "lucide-react";
import type { FlagshipWithDetail } from "@/lib/data/flagships";
import Image from "next/image";

export default function FlagshipVideoSection({ flagship }: { flagship: FlagshipWithDetail }) {
  return (
    <section className="bg-stone-100 px-6 pb-16 md:px-12 md:pb-20 lg:px-20 xl:px-[8.5vw]">
      <a
        href={flagship.video.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${flagship.name} video`}
        className="group relative block aspect-video w-full overflow-hidden lg:w-2/3"
      >
        <Image
          src={flagship.video.thumbnail}
          alt=""
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white transition-transform group-hover:scale-110">
            <Play size={20} strokeWidth={0} fill="black" className="ml-1" />
          </span>
        </div>
      </a>
    </section>
  );
}
