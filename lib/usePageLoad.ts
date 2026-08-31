"use client";

import { useLoaderStore } from "@/lib/loaderStore";
import { useEffect, useRef } from "react";

/**
 * Initializes page load tracking and updates the loader store with real progress.
 * Should be called once in the layout root to track initial page load.
 *
 * Milestones:
 * - 10%: DOM loading started
 * - 30%: DOM interactive (DOM fully parsed, scripts executing)
 * - 90%: Page load complete (all resources loaded)
 * - 100%: Marked as loaded, preloader can disappear
 */
export function usePageLoad() {
  const { setProgress, setLoaded } = useLoaderStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once per app lifecycle
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Safety timeout: auto-complete loading after 10 seconds to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.warn(
        "[Preloader] Safety timeout reached (10s), marking page as loaded",
      );
      setLoaded();
    }, 10000);

    // Track DOM readiness progression
    const trackDOMState = () => {
      if (document.readyState === "loading") {
        setProgress(10);
      } else if (document.readyState === "interactive") {
        console.log("[Preloader] DOM interactive");
        setProgress(30);
      } else if (document.readyState === "complete") {
        console.log("[Preloader] DOM complete");
        setProgress(90);
      }
    };

    // Listen to readyState changes
    document.addEventListener("readystatechange", trackDOMState);
    trackDOMState(); // Check current state immediately

    // After window.load, mark as fully loaded
    const handleLoad = () => {
      console.log("[Preloader] All resources loaded, page ready");
      setLoaded();
      clearTimeout(safetyTimeout);
    };

    if (document.readyState === "complete") {
      // Already loaded when hook runs
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      document.removeEventListener("readystatechange", trackDOMState);
      window.removeEventListener("load", handleLoad);
      clearTimeout(safetyTimeout);
    };
  }, [setProgress, setLoaded]);
}
