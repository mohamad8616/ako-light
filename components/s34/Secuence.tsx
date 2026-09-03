"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionTitle from "@/utility/SectionTitle";
import Image from "next/image";
import MiddleScreenVideo from "../ui/MiddleFullscreenVideo";

const GALLERY_IMAGE =
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_41_C-3.jpg";

export default function Secuence() {
  const { t } = useLanguage();

  const kicker = t("s34.gallery.kicker");
  const p1 = t("s34.gallery.p1");
  const p2 = t("s34.gallery.p2");

  return (
    <>
      <HomepageSection className="bg-background flex h-[150vh] w-full items-center lg:-mt-90">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:grid-rows-[auto_1fr] lg:gap-16 xl:gap-20">
          {/* Image */}
          <div className="relative order-2 aspect-3/4 w-full overflow-hidden bg-[#111] lg:order-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Image
              src={GALLERY_IMAGE}
              alt={kicker}
              fill
              className="object-cover"
            />
          </div>

          {/* Title */}
          <div className="order-1 overflow-hidden lg:order-0 lg:col-start-2 lg:row-start-1">
            <SectionTitle className="text-white">{kicker}</SectionTitle>
          </div>

          {/* First paragraph */}
          <div className="order-3 lg:order-0 lg:col-start-2 lg:row-start-2">
            <Paragraph textColor="text-background-secondary">{p1}</Paragraph>
          </div>

          {/* Second paragraph */}
          <div className="order-4 lg:order-0 lg:col-start-3 lg:row-start-2">
            <Paragraph textColor="text-background-secondary">{p2}</Paragraph>
          </div>
        </div>
      </HomepageSection>
      <MiddleScreenVideo src="/videos/aboutvid.mp4" className="-mt-48" />
    </>
  );
}
