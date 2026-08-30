"use client";

import { homepageSections } from "@/lib/data/homepage";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import HomepageSection from "../../utility/HomepageSection";
import PlusTextBtn from "../ui/PlusTextBtn";

export default function HomeCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "keepSnaps",
    dragThreshold: 16,
    dragFree: true,
    duration: 500,
    loop: false,
    inViewThreshold: 0.5,
  });

  const carouselItems = homepageSections.carousel;

  // IntersectionObserver for entry animation
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

  return (
    <HomepageSection
      ref={sectionRef}
      className="bg-background-secondary w-full overflow-hidden border-y border-white/10 px-6 py-20 md:px-12 md:py-28 lg:py-32"
    >
      {/* Horizontal Scroll Carousel — Embla viewport */}
      <div
        ref={emblaRef}
        className="no-scrollbar mx-auto max-w-[1600px] cursor-grab overflow-hidden pb-2 active:cursor-grabbing"
      >
        {/* Embla container (first child of the viewport) */}
        <div
          className={`carousel flex gap-10 sm:gap-14 lg:gap-14 ${
            inView ? "in-view" : ""
          }`}
        >
          {carouselItems.map((item) => (
            <div
              key={item.title}
              className="group relative w-[50vw] shrink-0 sm:w-[68vw] md:w-[64vw] lg:w-[24vw] xl:w-[22vw]"
            >
              <Link href="/hlife" className="block">
                <div className="relative aspect-4/5 w-full overflow-hidden bg-[#111]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
                </div>

                <PlusTextBtn
                  text={item.title}
                  textColor="text-background"
                  className="mt-7"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}
