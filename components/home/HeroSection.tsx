"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { ResolvedHeroFeature } from "@/lib/repositories/homepage-features";
import { useEffect, useRef, useState } from "react";
import HeroSectionText from "../ui/HeroSectionText";

/**
 * The built-in hero assets. They are what renders until an operator uploads a
 * replacement, so the section is never dependent on the database to paint —
 * a missing slot row and a cleared field both land here.
 */
const DEFAULT_VIDEO = "/videos/hero.mp4";
const DEFAULT_POSTER = "/videos/hero-poster.jpg";
/** The component's own button destination; the slot can override it. */
const DEFAULT_CTA_HREF = "/catalogue";

/**
 * The homepage hero (Pass D.1).
 *
 * ── What the slot can change, and what it cannot ────────────────────────────
 *
 * The operator can override the video, the poster, both headline lines, the
 * button label and the button destination. Everything else — the full-screen
 * layout, the gradient, the entrance animation, the scroll indicator, the
 * font/direction switching — is untouched, because none of it is content.
 *
 * Each field falls back INDEPENDENTLY to what the component rendered before the
 * slot existed: the `hero.*` dictionary strings and the /public assets. So the
 * hero is pixel-identical with an empty table, and a half-filled slot changes
 * only the fields it names.
 */
export default function HeroSection({
  data,
}: {
  /** Server-resolved slot data; `null` renders the built-in hero. */
  data: ResolvedHeroFeature | null;
}) {
  const { t, lang } = useLanguage();

  // `enabled: false` hides the section entirely, like every other slot.
  if (data && !data.enabled) return null;

  const firstLine = data?.firstLine
    ? pick(data.firstLine, lang)
    : t("hero.collection");
  const secondLine = data?.secondLine
    ? pick(data.secondLine, lang)
    : t("hero.ritualGravity");
  const btn = data?.ctaLabel ? pick(data.ctaLabel, lang) : t("hero.readMore");

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <Video
        src={data?.videoUrl ?? DEFAULT_VIDEO}
        poster={data?.posterUrl ?? DEFAULT_POSTER}
      />

      <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/35" />

      {/* Hero copy — bottom-left aligned, tight leading between the two lines */}
      <HeroSectionText
        firstLine={firstLine}
        secondLine={secondLine}
        btn={btn}
        href={data?.ctaHref ?? DEFAULT_CTA_HREF}
      />
    </section>
  );
}

function Video({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  /**
   * Starts `false` on BOTH the server and the client.
   *
   * It used to start as `typeof IntersectionObserver === "undefined"`, which is
   * TRUE on the server (there is no IntersectionObserver in Node) and FALSE in
   * the browser — so the server HTML carried the `<source>` and `autoPlay`
   * while the client's first render did not, and React logged a hydration
   * mismatch and threw the whole hero away to regenerate it. The intent
   * documented below is to DEFER the bytes until the hero is in view, and that
   * is what this now does consistently on both sides. The no-observer fallback
   * is preserved inside the effect, where it cannot diverge.
   */
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (very old browsers) → load immediately.
    //
    // Queued rather than set synchronously: a setState in the effect BODY is a
    // cascading render (React's `set-state-in-effect` rule), and the observer
    // path below is the shape the rule wants — subscribe, then set state from
    // the callback. This is the same subscription, with the callback fired on
    // the next tick.
    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setShouldLoad(true), 0);
      return () => clearTimeout(id);
    }

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
  }, []);

  return (
    <video
      ref={ref}
      autoPlay={shouldLoad}
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover"
    >
      {shouldLoad && <source src={src} type="video/mp4" />}
    </video>
  );
}
