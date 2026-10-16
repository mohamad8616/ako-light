"use client";

import { cn } from "@/lib/utils";
import { displayCategoryName } from "@/lib/i18n/localized";
import type { Language } from "@/lib/i18n/translations";
import Image from "next/image";
import Link from "@/lib/i18n/Link";
import { type CSSProperties } from "react";
import PlusTextBtn from "../PlusTextBtn";
import {
  DEFAULT_HEIGHT,
  DEFAULT_SLIDE_WIDTHS,
  DOUBLE_SLIDE_WIDTHS,
  IMAGE_TRANSITION,
  MULTI_HEIGHT,
  OVERLAY_TRANSITION,
} from "./constants";
import type { CarouselItem } from "./types";

export type SlideProps = {
  image: string;
  index: number;
  multiWidth: boolean;
  hasCategoryCta: boolean;
  fontClass: string;
  /** Active locale — needed to resolve the category label. */
  lang: Language;
  t: (key: string) => string;
  cta: Required<CarouselItem> | null;
  href?: string;
  onOpen: (index: number) => void;
};

/**
 * One slide in the Embla carousel.
 *
 * In `"link"` mode the whole image is an anchor (category items → their own
 * `link`; plain slides → the shared `href`). In `"gallery"` mode the image
 * is a click target that opens the lightbox at this slide.
 */
export default function Slide({
  image,
  index,
  multiWidth,
  hasCategoryCta,
  fontClass,
  lang,
  t,
  cta,
  href,
  onOpen,
}: SlideProps) {
  const widthClass = multiWidth
    ? index % 2 === 0
      ? DEFAULT_SLIDE_WIDTHS
      : DOUBLE_SLIDE_WIDTHS
    : DEFAULT_SLIDE_WIDTHS;
  // Match `sizes` to the rendered slide widths above so the optimizer serves
  // a matching variant instead of the full-size original (mobile especially).
  const sizes =
    multiWidth && index % 2 === 1
      ? "(min-width: 1280px) 46vw, (min-width: 1024px) 48vw, (min-width: 768px) 64vw, (min-width: 640px) 90vw, 100vw"
      : "(min-width: 1280px) 23vw, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, (min-width: 640px) 45vw, 60vw";
  const heightClass = multiWidth ? MULTI_HEIGHT : DEFAULT_HEIGHT;
  // Dictionary-first, with the row's own bilingual `name` as the fallback —
  // see `displayCategoryName`. Feeding the raw `cta.name` into `t()` is what
  // used to render a brand-new category as its translation key
  // ("products.car") on the tile, in `alt` and in `aria-label`.
  const alt =
    hasCategoryCta && cta ? displayCategoryName(t, cta, lang) : "";

  const style: CSSProperties = {
    transitionDelay: `${(index % 6) * 0.06}s`,
  };

  const clickable = href ? (
    <Link
      href={href}
      aria-label={alt || undefined}
      className={cn(
        "relative block w-full overflow-hidden bg-[#111]",
        heightClass,
      )}
    >
      <Image
        src={image}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-cover", IMAGE_TRANSITION)}
      />
      <div className={cn("absolute inset-0 bg-black/0", OVERLAY_TRANSITION)} />
    </Link>
  ) : (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(index)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(index);
        }
      }}
      className={cn(
        "relative block w-full cursor-pointer overflow-hidden bg-[#111]",
        heightClass,
      )}
    >
      <Image
        src={image}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-cover", IMAGE_TRANSITION)}
      />
      <div className={cn("absolute inset-0 bg-black/0", OVERLAY_TRANSITION)} />
    </div>
  );

  return (
    <div
      style={style}
      className={cn(
        "group flex shrink-0 flex-col items-start justify-center gap-5",
        widthClass,
      )}
    >
      {clickable}
      {cta && (
        <PlusTextBtn
          text={displayCategoryName(t, cta, lang)}
          href={cta.link}
          className={cn(fontClass, "text-background text-sm lg:text-base")}
          textColor="text-background"
        />
      )}
    </div>
  );
}
