"use client";

import HomepageSection from "@/utility/HomepageSection";
import SectionSubTitle from "@/utility/SectionSubTitle";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// ----- images array -----
const images = [
  "https://www.henge07.com/app/uploads/2023/04/H19_FOTO_01.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0301-1.jpg",
  "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_4403.jpg",
  "https://www.henge07.com/app/uploads/2023/04/HENGE_MAR17_5741.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge_0793-SG.jpg",
  "https://www.henge07.com/app/uploads/2023/04/henge-24092016809m.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG_3166.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0391.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG_3168.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0481.jpg",
  "https://www.henge07.com/app/uploads/2023/04/IMG5_43789.jpg",
  "https://www.henge07.com/app/uploads/2025/07/Henge0312-1.jpg",
];

// ----- detect touch/coarse pointer (gates the cursor circle only) -----
const subscribeToPointer = (callback: () => void) => {
  const mql = window.matchMedia("(hover: none), (pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const getPointerSnapshot = () =>
  window.matchMedia("(hover: none), (pointer: coarse)").matches;
const getServerSnapshot = () => false;

export default function ImageGalleryCarousel({ circle }: { circle: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  // Embla powers the carousel: free momentum drag, no snap-to-slide.
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false,
  });

  // ----- entry animation state -----
  const [inView, setInView] = useState(false);

  // ----- circle cursor state -----
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const isTouch = useSyncExternalStore(
    subscribeToPointer,
    getPointerSnapshot,
    getServerSnapshot,
  );

  // ----- IntersectionObserver for entry animation -----
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  // ----- cursor circle scale/opacity (CSS transitions) -----
  const circleStyle = {
    left: cursorPos.x,
    top: cursorPos.y,
    translate: "-50% -50%",
    scale: hovering ? 1 : 0,
    opacity: hovering ? 1 : 0,
    transition:
      "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), scale 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  return (
    <HomepageSection
      ref={sectionRef}
      className="bg-background-secondary w-full overflow-hidden border-y border-white/10 py-20 md:py-28 lg:py-32"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="mb-10 flex max-w-[1600px] items-end justify-between px-6 md:mb-14 md:px-12">
        <SectionSubTitle>Image Gallery</SectionSubTitle>
      </div>

      {/* ----- carousel — Embla viewport ----- */}
      <div
        ref={emblaRef}
        className="no-scrollbar mx-auto max-w-[1600px] cursor-grab overflow-hidden pb-2 active:cursor-grabbing"
      >
        {/* Embla container (first child of the viewport) */}
        <div
          className={`carousel flex gap-4 md:gap-6 ${inView ? "in-view" : ""}`}
        >
          {images.map((src, i) => (
            <div
              key={src}
              style={{ transitionDelay: `${(i % 6) * 0.06}s` }}
              className="group relative aspect-4/5 w-[70vw] shrink-0 overflow-hidden bg-[#111] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]"
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
            </div>
          ))}
        </div>
      </div>

      {/* ----- cursor circle with arrow ----- */}
      {circle && !isTouch && (
        <div
          className="pointer-events-none fixed z-50 hidden h-20 w-20 rounded-full bg-white mix-blend-difference md:flex md:items-center md:justify-center"
          style={circleStyle}
        >
          {/* Arrow pointing top-right */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white mix-blend-difference"
          >
            <path d="M7 7h10v10" />
            <path d="M7 17L17 7" />
          </svg>
        </div>
      )}
    </HomepageSection>
  );
}
