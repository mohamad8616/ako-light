"use client";

import { useHeroVideoStore } from "@/lib/heroVideoStore";
import { useLenis } from "@/lib/lenisStore";
import { EASE } from "@/utility/HomepageSection";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** Backdrop fade duration (s) — the video starts while the screen darkens,
 *  so the user sees a smooth darken → reveal instead of a sudden pop-in. */
const BACKDROP_FADE_S = 0.22;

type VideoModalProps = {
  open: boolean;
  videoSrc: string;
  onClose: () => void;
};

/**
 * Standalone fullscreen video player modal — deliberately decoupled from
 * any page section (callers like HeroVideo merely toggle `open`).
 *
 * It owns everything playback-related:
 *  • Renders to `document.body` via a portal so it escapes any ancestor
 *    `transform` / `clip` containing block (framer-motion in particular).
 *  • Locks page scroll while open (Lenis stop + `scroll-locked` class,
 *    same pattern as LightboxModal) and releases it on close/unmount.
 *  • The close button is `fixed` to the viewport's top-right, so it is
 *    always reachable no matter where the page behind is scrolled.
 *  • Publishes playing state to `heroVideoStore` so the navbar hides
 *    itself instead of sitting over the close button.
 *  • Closes on Escape or a backdrop (letterbox) click; plays with sound
 *    while open, pauses and re-mutes on close.
 */
export default function VideoModal({
  open,
  videoSrc,
  onClose,
}: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { lock, unlock } = useLenis();
  const setPlaying = useHeroVideoStore((s) => s.setPlaying);
  const { t } = useLanguage();

  // Scroll lock while open; release on close AND on unmount (navigating
  // away while the player is up must never leave the page locked).
  useEffect(() => {
    if (!open) return;
    lock();
    document.documentElement.classList.add("scroll-locked");
    return () => {
      unlock();
      document.documentElement.classList.remove("scroll-locked");
    };
  }, [open, lock, unlock]);

  // Tell sibling UI (the navbar) to get out of the way while open.
  useEffect(() => {
    setPlaying(open);
    return () => setPlaying(false);
  }, [open, setPlaying]);

  // Play with sound while open; pause + re-mute on close.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (open) {
      video.muted = false;
      video.play().catch(() => {
        /* rejected — the native controls are available for manual play */
      });
    } else {
      video.pause();
      video.muted = true;
    }
  }, [open]);

  // Escape closes. Listener only attached while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          dir="ltr"
          role="dialog"
          aria-modal="true"
          aria-label={t("video.player")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: BACKDROP_FADE_S, ease: EASE }}
          onClick={onClose}
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/95"
        >
          {/* stopPropagation → clicking the video/its native controls must
              not close the modal (only backdrop + close button do). */}
          <video
            ref={videoRef}
            controls
            autoPlay
            loop
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>

          {/* Close — pinned to the viewport's top-right, always visible. */}
          <button
            type="button"
            aria-label={t("video.close")}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-white/20"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
