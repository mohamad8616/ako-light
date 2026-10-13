"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ResolvedVideoFeature } from "@/lib/repositories/homepage-features";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import HomepageSection, { EASE } from "../../utility/HomepageSection";

/**
 * The homepage video section (Pass D.1).
 *
 * What the slot configures is the section's MEDIA: the video and the poster
 * frame painted before it starts. The placeholder copy, the layout and the
 * play/pause-on-visibility behaviour are not content — an unset slot renders
 * exactly what this component always rendered.
 *
 * There is deliberately NO built-in video any more: the shipped
 * `/videos/afterhenge.mp4` was removed by the operator (Pass D.1 follow-up), so
 * an unset `videoUrl` means the section has nothing to render and it renders
 * NOTHING — a permanently empty aspect-video box would look broken, which is
 * worse than the section simply not being on the page until a video is chosen.
 *
 * ── The poster ───────────────────────────────────────────────────────────────
 *
 * The poster is a PRELOADER: it is the frame the visitor sees while the video
 * buffers. An operator who supplies one has already decided what that frame
 * should be, so the brand caption is dropped when a poster is set — otherwise
 * it would just sit on top of their image. With no poster the caption behaves
 * exactly as before.
 *
 * ── Why the source is attached EAGERLY (the load-time fix) ───────────────────
 *
 * The `<source>` used to be mounted only once the section scrolled into view.
 * That reads as thrifty — "do not fetch a large file nobody has reached" — but
 * it makes the video SLOW for everyone who does reach it: the fetch, the
 * container parse and the first-frame decode all start at the exact moment the
 * visitor arrives, so they watch an empty box while it happens. That is the
 * reported "too slow in loading; it can't load the video in time".
 *
 * Now the source is attached on mount and the browser prefetches with
 * `preload="metadata"` — the moov atom and the first frame, not the payload —
 * during the page's own load, in parallel with everything else. PLAYBACK is
 * still gated on visibility (below), so nothing plays until the section is on
 * screen; only the metadata is fetched early. A 6 MB film costs a small
 * metadata request up front and starts instantly when it is reached, which is
 * the trade the operator asked for.
 *
 * ── Controls ─────────────────────────────────────────────────────────────────
 *
 * There is deliberately NO `controls` attribute: this is a decorative
 * background film, and native controls would drop a scrub bar over the artwork.
 * Absence is what disables them — do not add the attribute back.
 */
export default function VideoSection({
  data,
}: {
  /** Server-resolved slot data; `null` renders nothing. */
  data: ResolvedVideoFeature | null;
}) {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Becomes true once the video reports it's actually playing, so we
  // know it's safe to fade the placeholder out.
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  /**
   * Play while the section is on screen, pause when it leaves.
   *
   * The ref is always populated now that the `<video>` is mounted from the
   * start, so the first intersection really does start playback — previously
   * the element did not exist yet on that first callback and the call was a
   * silent no-op, which is why the film only began after scrolling past the
   * section and back.
   */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting) {
          // Autoplay can be refused (low-power mode, a strict policy). That is
          // not an error state — the poster stays up and the visitor can start
          // it themselves — so a rejection is swallowed rather than reported.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // `enabled: false` hides the section, like every other slot.
  if (data && !data.enabled) return null;

  // No video configured → nothing to show. See the header note.
  const src = data?.videoUrl ?? null;
  if (!src) return null;

  /**
   * The preloader frame. NULL means "no poster", which is NOT the same as an
   * empty attribute: `poster=""` makes the browser request the page URL as an
   * image, so absence is spelled `undefined`.
   */
  const poster = data?.posterUrl ?? undefined;

  const playVideo = () => {
    setPlaybackFailed(false);
    videoRef.current?.play().catch(() => setPlaybackFailed(true));
  };

  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      {/* One width system: the section's own fluid gutters. No nested
          container — the video uses the full fluid width on large screens. */}
      <div ref={sectionRef} className="relative">
        <div className="bg-background relative aspect-video w-full overflow-hidden">
          {/* Brand caption shown until the video is actually playing. Skipped
              when a poster was supplied — the poster IS the pre-frame. */}
          <AnimatePresence>
            {!isPlaying && !poster && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
                className="bg-background absolute inset-0 z-10 flex items-center justify-center"
              >
                <span className="text-background-secondary text-sm font-light tracking-[0.4em] uppercase md:text-base">
                  {t("video.akoLighting")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            poster={poster}
            onPlaying={() => {
              setIsPlaying(true);
              setPlaybackFailed(false);
            }}
            onPause={() => setIsPlaying(false)}
            onError={() => setPlaybackFailed(true)}
            className="h-full w-full object-cover"
          >
            <source src={src} />
          </video>

          {!isPlaying && playbackFailed && (
            <button
              type="button"
              onClick={playVideo}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 text-white"
              aria-label={t("video.player")}
            >
              <span className="flex items-center gap-3 rounded-full border-white/70 px-5 py-3 text-sm uppercase tracking-widest">
                <Play aria-hidden="true" className="size-4" />
                {t("video.player")}
              </span>
            </button>
          )}
        </div>
      </div>
    </HomepageSection>
  );
}
