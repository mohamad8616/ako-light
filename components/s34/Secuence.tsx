"use client";

import { s34Sections } from "@/lib/data/s34";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import Image from "next/image";
import MiddleScreenVideo from "../ui/MiddleFullscreenVideo";

export default function Secuence() {
  const { gallery } = s34Sections;
  const [paragraphOne, paragraphTwo] = gallery.paragraphs;
  const image = gallery.images[0];

  return (
    <>
      <HomepageSection className="bg-background flex h-[150vh] w-full items-center lg:-mt-90">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:gap-16 xl:gap-20">
          
          {/* Image — one static photo, sized 3:4 to match the reference.
              Sourced from the existing gallery array as a stand-in. */}
          <div className="relative order-2 aspect-3/4 w-full overflow-hidden bg-[#111] lg:order-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Image
              src={image}
              alt={gallery.kicker}
              fill
              className="object-cover"
            />
          </div>

          {/* Title */}
          <div className="order-1 overflow-hidden lg:order-0 lg:col-start-2 lg:row-start-1">
            <SectionTitle className="text-white">{gallery.kicker}</SectionTitle>
          </div>

          {/* First paragraph — stacked directly under the title */}
          <div className="order-3 lg:order-0 lg:col-start-2 lg:row-start-2">
            <Paragraph textColor="text-background-secondary">
              {paragraphOne}
            </Paragraph>
          </div>

          {/* Second paragraph — third column, same row as the first
              paragraph so the two align horizontally */}
          <div className="order-4 lg:order-0 lg:col-start-3 lg:row-start-2">
            <Paragraph textColor="text-background-secondary">
              {paragraphTwo}
            </Paragraph>
          </div>
        </div>
      </HomepageSection>
      <MiddleScreenVideo src="/videos/aboutvid.mp4" className="-mt-48" />
    </>
  );
}
