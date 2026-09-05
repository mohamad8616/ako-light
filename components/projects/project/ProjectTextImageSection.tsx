"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick, type Localized } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import Image from "next/image";

interface Props {
  /** Plain string OR a `Localized` object (resolved reactively via context). */
  text: Localized | string;
  image: string;
  /** Swaps to text-right / image-left on lg+. Mobile order is unaffected
      (image always leads, text follows) since both variants collapse
      the same way on small screens. */
  reverse?: boolean;
}

export default function ProjectTextImageSection({
  text,
  image,
  reverse = false,
}: Props) {
  const { lang } = useLanguage();
  return (
    <HomepageSection className="py-20 md:py-28">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        {/* Text — 40% on lg+ */}
        <div
          className={cn(
            "w-full lg:w-[40%]",
            reverse ? "lg:order-2" : "lg:order-1",
          )}
        >
          <Paragraph textColor="text-background-secondary">
            {pick(text, lang)}
          </Paragraph>
        </div>

        {/* Image — 60% on lg+ */}
        <div
          className={cn(
            "relative aspect-3/2 w-full overflow-hidden lg:w-[60%]",
            reverse ? "lg:order-1" : "lg:order-2",
          )}
        >
          <Image
            src={image}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 60vw, 100vw"
          />
        </div>
      </div>
    </HomepageSection>
  );
}
