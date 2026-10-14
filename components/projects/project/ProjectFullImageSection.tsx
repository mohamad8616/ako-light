"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick, type Localized } from "@/lib/i18n/localized";
import HomepageSection from "@/utility/HomepageSection";
import Image from "next/image";

interface Props {
  image: string;
  /** Plain string OR a `Localized` object (resolved reactively via context). */
  caption: Localized | string;
}

/**
 * The full-width photo under a project's text+image block, with its caption.
 *
 * The caption used to be pinned inside `max-w-md` (28rem ≈ 55 characters), which
 * is narrower than the paragraph measure the rest of the site uses — so the same
 * text wrapped differently here than in the block above it, and a longer caption
 * turned into a tall thin ribbon. The cap is gone: the caption is a normal
 * paragraph at `Paragraph`'s own `max-w-prose`, which is the reading measure
 * used everywhere else.
 *
 * `min-w-0` on the wrapper matches `ProjectTextImageSection`: a flex/block child
 * defaults to `min-width: auto` and would otherwise grow to fit a long
 * unbreakable token, widening the page.
 */
export default function ProjectFullImageSection({ image, caption }: Props) {
  const { lang } = useLanguage();
  console.log(pick(caption, lang));

  return (
    <HomepageSection className="py-20 md:py-28">
      <div className="relative aspect-2/1 w-full overflow-hidden">
        <Image src={image} alt="" fill className="object-cover" sizes="100vw" />
      </div>

      <div className="mt-8 w-full min-w-0 md:mt-10">
        {/* <Paragraph textColor="text-background-secondary ">
        </Paragraph> */}
        <p className="wrap-break-word leading-7 w-2/5 text-justify">{pick(caption, lang)}</p>
      </div>
    </HomepageSection>
  );
}
