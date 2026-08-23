"use client";

import { useLenis } from "@/lib/lenisStore";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const HIDE_DURATION = 700;

export default function PageLoader() {
  const pathname = usePathname();
  const { lock, unlock } = useLenis();
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(true);
  const isFirstRender = useRef(true);

  // Trigger on every route change (skip the very first render).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setVisible(true);
    setGone(false);
  }, [pathname]);

  // Lock scroll while visible, then fade out and unmount.
  useEffect(() => {
    if (!visible) return;

    lock();

    const hideTimer = setTimeout(() => {
      setVisible(false);
      unlock();
    }, HIDE_DURATION);

    const goneTimer = setTimeout(() => setGone(true), HIDE_DURATION + 400);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(goneTimer);
      unlock();
    };
  }, [visible, lock, unlock]);

  if (gone) return null;

  return (
    <div
      className={`bg-background fixed inset-0 z-1000 flex items-center justify-center transition-opacity duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    >
      <span className="border-background-secondary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  );
}
