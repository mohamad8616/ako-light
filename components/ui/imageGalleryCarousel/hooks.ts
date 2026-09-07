"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";
import { LG_BREAKPOINT_QUERY, POINTER_QUERY } from "./constants";

/** `true` when the user is on a touch / coarse-pointer device. */
export function useIsTouch(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(POINTER_QUERY);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(POINTER_QUERY).matches,
    () => false,
  );
}

/** `true` when the viewport is at least the `lg` breakpoint (1024px). */
export function useIsLg(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(LG_BREAKPOINT_QUERY);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(LG_BREAKPOINT_QUERY).matches,
    () => false,
  );
}

/** `true` once the element scrolls into view (and stays `true`). */
export function useInView<T extends Element>(
  threshold = 0.1,
): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}
