"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HomepageSection from "@/utility/HomepageSection";
import SectionSubTitle from "@/utility/SectionSubTitle";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// const images = carouselImages;

// ----- detect touch/coarse pointer (gates the cursor circle only) -----
const subscribeToPointer = (callback: () => void) => {
  const mql = window.matchMedia("(hover: none), (pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const getPointerSnapshot = () =>
  window.matchMedia("(hover: none), (pointer: coarse)").matches;
const getServerSnapshot = () => false;

// ----- generate random widths for multiWidth mode -----
const generateRandomWidths = (count: number): string[] => {
  const widthPercentages = [25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50];
  return Array.from({ length: count }, () => {
    const randomPercentage =
      widthPercentages[Math.floor(Math.random() * widthPercentages.length)];
    return `w-[${randomPercentage}vw]`;
  });
};

export default function ImageGalleryCarousel({
  circle = false,
  multiWidth = false,
  mobileColumn = false,
  images,
  category,
}: {
  circle?: boolean;
  multiWidth?: boolean;
  mobileColumn?: boolean;
  images?: string[];
  category?: {
    name: string;
    image: string;
    link: string;
  }[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const { dir } = useLanguage();

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false,
    direction: dir === "rtl" ? "rtl" : "ltr",
  });

  // ----- entry animation state -----
  const [inView, setInView] = useState(false);

  // ----- circle cursor state -----
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  // ----- random widths for multiWidth mode -----
  const [randomWidths] = useState(() =>
    generateRandomWidths(images?.length ?? 0),
  );

  const isTouch = useSyncExternalStore(
    subscribeToPointer,
    getPointerSnapshot,
    getServerSnapshot,
  );

  const isRtl = dir === "rtl";

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

  if (!images || images.length === 0 && !category) return null;

  return (
    <HomepageSection
      ref={sectionRef}
      className="bg-background-secondary w-full overflow-hidden border-y border-white/10 py-20 md:py-28 lg:py-32"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="mb-10 flex items-end justify-between md:mb-14">
        <SectionSubTitle>Image Gallery</SectionSubTitle>
      </div>

      {/* ----- mobile column layout (only when mobileColumn is true, hidden on lg+) ----- */}
      {mobileColumn && images.length > 0 && <MobileColumn images={images} />}

      {/* ----- carousel â€” Embla viewport (hidden on mobile when mobileColumn is true) ----- */}
      <div className={mobileColumn ? "hidden lg:block" : ""}>
        <div
          ref={emblaRef}
          className="no-scrollbar mx-auto cursor-grab overflow-hidden pb-2 active:cursor-grabbing"
        >
          {/* Embla container (first child of the viewport) */}
          <div
            className={`carousel flex gap-4 md:gap-6 ${inView ? "in-view" : ""}`}
          >
            {images.map((src, i) => {
              const isMultiWidth = multiWidth && randomWidths[i];
              const widthClass = isMultiWidth
                ? ""
                : "w-[70vw] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]";
              const heightClass = multiWidth
                ? "h-[50vh] sm:h-[45vh] md:h-[50vh]"
                : "aspect-4/5";

              // Extract random width percentage for inline style
              const randomWidthStr = isMultiWidth ? randomWidths[i] : "";
              const widthMatch = randomWidthStr.match(/\[(\d+)vw\]/);
              const inlineWidth = widthMatch ? `${widthMatch[1]}vw` : undefined;

              return (
                <div
                  key={src}
                  style={{
                    transitionDelay: `${(i % 6) * 0.06}s`,
                    ...(inlineWidth && { width: inlineWidth }),
                  }}
                  className={`group relative ${heightClass} ${widthClass} shrink-0 overflow-hidden bg-[#111]`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ----- cursor circle with arrow ----- */}
      {circle && !isTouch && (
        <div
          className="pointer-events-none fixed -z-50 hidden h-20 w-20 rounded-full bg-white mix-blend-difference md:flex md:items-center md:justify-center"
          style={circleStyle}
        >
          {/* Arrow pointing top-right (top-left in RTL) */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-white mix-blend-difference ${isRtl ? "rotate-180" : ""}`}
          >
            <path d="M7 7h10v10" />
            <path d="M7 17L17 7" />
          </svg>
        </div>
      )}
    </HomepageSection>
  );
}

function MobileColumn({ images }: { images: string[] }) {
  return (
    <div className="mx-auto block lg:hidden">
      <div className="grid grid-cols-1 gap-2">
        {images.map((src) => (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            key={src}
            className="group relative aspect-video w-full overflow-hidden bg-[#111]"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
