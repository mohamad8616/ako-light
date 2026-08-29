"use client";
import { s34Sections } from "@/lib/data/s34";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import { ArrowDown, Plus } from "lucide-react";
import Link from "next/link";

// Placeholder — swap for the real S34/4 catalogue PDF URL.
const CATALOGUE_HREF = "#";
// Approximate fabric-cover tone from the screenshot.
const CATALOGUE_COVER_COLOR = "#8b96a6";

export default function CatalogueDownloadSection() {
  return (
    <HomepageSection className="flex min-h-screen w-full items-center bg-stone-100 px-6 py-20 md:px-12 lg:px-20 xl:px-[8.5vw]">
      <div className="grid w-full grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center lg:gap-24">
        <div className="space-y-7">
          <span className="font-din text-xs font-normal tracking-tighter text-stone-500 uppercase">
            {process.env.NEXT_PUBLIC_APP_NAME} Catalogue
          </span>

          <SectionTitle className='tracking-tighter font-medium'>Download our latest catalogue</SectionTitle>

          <Paragraph 
       >
            {s34Sections.concept.paragraphs[0]}
          </Paragraph>
        </div>

        <div className="flex flex-col gap-6 lg:max-w-md lg:justify-self-end">
          {/* Placeholder cover — swap for real catalogue photography */}
          <Link
            href={CATALOGUE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            download
            aria-label="Download the S34/4 catalogue"
            className="group relative block aspect-3/4 w-full overflow-hidden"
            style={{ backgroundColor: CATALOGUE_COVER_COLOR }}
          >
            <span className="font-din absolute top-1/2 left-[38%] -translate-x-1/2 -translate-y-1/2 -rotate-90 text-2xl font-bold tracking-tight whitespace-nowrap text-stone-950 uppercase md:text-3xl">
              Henge
            </span>

            <span className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-stone-950 transition-transform duration-300 group-hover:scale-105 md:h-20 md:w-20">
              <ArrowDown size={22} strokeWidth={2} className="text-white" />
            </span>
          </Link>

          <Link
            href={CATALOGUE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="font-din flex w-fit items-center gap-2 text-xs font-medium tracking-tighter text-stone-950 uppercase transition-colors hover:text-stone-600"
          >
            <Plus size={12} strokeWidth={2.5} />
            S34/4 Catalogue Download
          </Link>
        </div>
      </div>
    </HomepageSection>
  );
}
