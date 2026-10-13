"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import type { ResolvedHeroFeature } from "@/lib/repositories/homepage-features";
import { useEffect, useRef, useState } from "react";
import HeroSectionText from "../ui/HeroSectionText";

/**
 * The hero's own button destination; the slot can override it.
 *
 * There is deliberately NO built-in video or poster any more. The shipped
 * `/videos/hero.mp4` + `/videos/hero-poster.jpg` assets were removed by the
 * operator (Pass D.1 follow-up) — `hero.mp4` was ALSO the hero video for /about
 * and /s34, which now read this slot's video instead — so "no override" means
 * "no video", not "the stock film". The section keeps its black background and
 * full-screen layout, so an unconfigured hero is a black hero with its copy,
 * never a broken element.
 */
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

  /*
    `h-[100svh]`, not `h-screen`.

    `h-screen` is `100vh`, which on a phone is the viewport with the browser
    chrome RETRACTED — so while the address bar is showing, the hero's bottom
    edge sits BELOW the visible area and everything anchored to it (the scroll
    indicator, the last line of copy) is off-screen until the visitor scrolls.

    `svh` is the SMALL viewport height: the size with the chrome expanded. It is
    the one unit that is guaranteed to fit at every moment, so the whole hero —
    copy, button and the scroll indicator at its bottom edge — is visible the
    instant the page opens, with no scrolling. `dvh` would also fit, but it
    CHANGES as the address bar hides and shows, which resizes the hero (and the
    video inside it) mid-scroll; `svh` is stable.
  */
  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-black">
      <Video src={data?.videoUrl ?? null} poster={data?.posterUrl ?? null} />

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

function Video({ src, poster }: { src: string | null; poster: string | null }) {
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

    const onFirstFrame = () => setShouldLoad(true);
    if (typeof requestAnimationFrame === "undefined") {
      const id = setTimeout(onFirstFrame, 0);
      return () => clearTimeout(id);
    }

    const frame = requestAnimationFrame(onFirstFrame);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay={shouldLoad}
      muted
      loop
      playsInline
      preload="metadata"
      // Absent rather than "" — an empty poster attribute makes the browser
      // request the page URL as an image.
      poster={poster ?? undefined}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover"
    >
      {shouldLoad && src ? <source src={src} /> : null}
    </video>
  );
}
