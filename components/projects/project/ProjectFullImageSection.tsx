"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick, type Localized } from "@/lib/i18n/localized";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import Image from "next/image";

interface Props {
  image: string;
  /** Plain string OR a `Localized` object (resolved reactively via context). */
  caption: Localized | string;
}

export default function ProjectFullImageSection({ image, caption }: Props) {
  const { lang } = useLanguage();
  return (
    <HomepageSection className="py-20 md:py-28">
      <div className="relative aspect-2/1 w-full overflow-hidden">
        <Image src={image} alt="" fill className="object-cover" sizes="100vw" />
      </div>

      <div className="mt-8 max-w-md md:mt-10">
        <Paragraph textColor="text-background-secondary">
          {pick(caption, lang)}
        </Paragraph>
      </div>
    </HomepageSection>
  );
}
