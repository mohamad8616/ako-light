"use client";

import HomepageSection from "@/utility/HomepageSection";
import Link from "next/link";
import type { Collection } from "@/lib/data/collections";

interface AboutCollectionProps {
  collection: Collection;
}

export default function AboutCollection({
  collection,
}: AboutCollectionProps) {
  const paragraphs = Object.values(collection.description);

  return (
    <HomepageSection>
      {/* Page */}
      <div className="min-h-screen lg:mx-0 lg:grid lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-16.25 lg:px-0 lg:pt-7.5 lg:pb-15">


        {/* Content */}
        
          {/* Main Content */}
          <div>
            {/* Breadcrumb */}
            <div className="mb-5 flex items-center gap-2.5 text-[9px] tracking-[-0.1px] text-[#242424] uppercase lg:mb-7.75 lg:gap-3.5 lg:text-[13px]">
              <Link href="/collections" className="relative pb-1">
                COLLECTIONS
                <span className="absolute bottom-0 left-0 h-px w-full bg-[#242424]" />
              </Link>

              <span>/</span>

              <span>{collection.name} COLLECTION</span>
            </div>

            {/* Title */}
            <h1 className="mb-5.25 text-[29px] leading-none font-normal tracking-[-1.1px] text-[#202020] uppercase lg:mb-9.75 lg:text-[53px] lg:tracking-[-2px]">
              {collection.name}
            </h1>

            {/* Description */}
            <div className="max-w-232.5 text-[16px] leading-[1.31] tracking-[-0.05px] text-[#414141] lg:text-[20px] lg:leading-[1.38] lg:tracking-[-0.1px]">
              {paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className={i < paragraphs.length - 1 ? "mb-5.75" : ""}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Downloads */}
          <aside className="mt-4.5 lg:mt-0">
            <h2 className="mb-3.75 text-[9px] font-semibold tracking-normal text-[#292929] uppercase lg:mb-7.5 lg:text-[13px]">
              DOWNLOAD
            </h2>

            <div className="flex flex-col items-start gap-0.5 text-[12px] leading-tight text-[#4a4a4a] lg:text-[19px]">
              <Link
                href="#"
                className="border-b border-[#666] hover:border-black"
              >
                Catalogue
              </Link>

              <Link
                href="#"
                className="border-b border-[#666] hover:border-black"
              >
                Images
              </Link>
            </div>
          </aside>
      </div>
    </HomepageSection>
  );
}
