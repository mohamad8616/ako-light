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
  /** Puts the PHOTO first and the paragraph under it. */
  reverse?: boolean;
}

/**
 * The paragraph + photo block under a project's gallery.
 *
 * ── ONE column, at every width ──────────────────────────────────────────────
 *
 * This used to be a two-column row on `lg+` — the paragraph in `lg:w-[40%]` with
 * the photo beside it. A body paragraph in a 40% column wraps every few words,
 * and the operator had no way to change it. It is now a single stacked column:
 * the paragraph spans the section at its own reading measure, and the photo sits
 * full-width below it.
 *
 * Note this is not a new layout — the component already stacked below `lg`, so
 * desktop now simply matches it. One definition instead of a breakpoint-specific
 * one.
 *
 * ── `min-w-0` is not decoration ─────────────────────────────────────────────
 *
 * A flex child defaults to `min-width: auto`, which means it refuses to shrink
 * below its content's intrinsic width. A single long unbreakable token therefore
 * widens the CHILD, then the flex container, then the page — producing the
 * horizontal scrollbar. `min-w-0` lets the child shrink to the container so the
 * paragraph's own `break-words` (utility/Paragraph.tsx) can do its job. The two
 * are a pair: `break-words` gives the browser somewhere to wrap, `min-w-0` stops
 * the box from growing in the first place.
 *
 * The paragraph keeps `Paragraph`'s `max-w-prose`: "full width" is not the goal,
 * a comfortable reading measure is. The PHOTO has no measure to respect, so it
 * does span the full width.
 */
export default function ProjectTextImageSection({
  text,
  image,
  reverse = false,
}: Props) {
  const { lang } = useLanguage();
  console.log(pick(text, lang));
  return (
    <HomepageSection className="py-20 md:py-28">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* Text — 40% on lg+ */}
          <div
            className={cn(
              "w-full lg:w-[40%]",
              reverse ? "lg:order-2" : "lg:order-1",
            )}
          >
            {/* <Paragraph textColor="text-background-secondary"></Paragraph> */}
            <p className="wrap-break-word leading-7 ">{pick(text, lang)}</p>
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
      </div>
    </HomepageSection>
  );
}
