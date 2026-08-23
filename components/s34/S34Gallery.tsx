/* eslint-disable @next/next/no-img-element */
"use client";

import { s34Sections } from "@/lib/data/s34";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import useEmblaCarousel from "embla-carousel-react";

export default function S34Gallery() {
  const { gallery } = s34Sections;

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
    duration: 800,
    loop: false,
  });

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Title */}
        <div className="overflow-hidden lg:w-1/3">
          <SectionTitle>{gallery.kicker}</SectionTitle>
        </div>

        {/* Paragraphs */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {gallery.paragraphs.map((p, i) => (
            <Paragraph key={i}>{p}</Paragraph>
          ))}
        </div>
      </div>

      {/* Image gallery — full-bleed horizontal carousel */}
      <div className="mt-16 md:mt-20">
        <div
          ref={emblaRef}
          className="no-scrollbar cursor-grab overflow-hidden active:cursor-grabbing"
        >
          <div className="flex gap-4 px-6 md:gap-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
            {gallery.images.map((src, i) => (
              <div
                key={i}
                className="group relative aspect-4/5 w-[70vw] shrink-0 overflow-hidden bg-[#111] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]"
              >
                <img
                  src={src}
                  alt={`${gallery.kicker} ${i + 1}`}
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </HomepageSection>
  );
}
