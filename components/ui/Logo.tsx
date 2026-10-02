"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface AkoLightingLogoProps {
  className?: string;
  /**
   * A brand logo image from the Media library (Pass 13.5D).
   *
   * Null/undefined falls back to the text wordmark, which is what the site
   * rendered before this pass — so a fresh database, a cleared logo, or a
   * deleted Media row all keep the navbar looking exactly as it did rather than
   * showing a broken image.
   */
  src?: string | null;
  /** Accessible name for the image form; defaults to the brand wordmark. */
  alt?: string;
}

export default function Logo({ className, src, alt }: AkoLightingLogoProps) {
  const { lang } = useLanguage();
  const wordmark = lang === "fa" ? "هوم فرم" : "HOME FORM";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt && alt.length > 0 ? alt : wordmark}
        className={className}
      />
    );
  }

  return (
    <p
      className={`${lang === "fa" ? "font-noora" : "font-din"} lg:text-lg font-semibold ${className}`}
    >
      {wordmark}
    </p>
  );
}
