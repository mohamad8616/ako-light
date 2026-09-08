"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HeroSectionText from "../ui/HeroSectionText";

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <Video />

      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/35" />

      {/* Hero copy — bottom-left aligned, tight leading between the two lines */}
      <HeroSectionText firstLine={t("hero.collection")} secondLine={t("hero.ritualGravity")} btn={t("hero.readMore")} />
    </section>
  );
}

function Video() {
  const ref = useRef<HTMLVideoElement>(null);
  // No IntersectionObserver (very old browsers) → load immediately.
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  // Defer the video bytes until the hero is about to enter the viewport.
  // The poster paints instantly, so first paint no longer waits on video data.
  useEffect(() => {
    if (shouldLoad) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <video
      ref={ref}
      autoPlay={shouldLoad}
      muted
      loop
      playsInline
      preload="metadata"
      poster="/videos/hero-poster.jpg"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover"
    >
      {shouldLoad && <source src="/videos/hero.mp4" type="video/mp4" />}
    </video>
  );
}

