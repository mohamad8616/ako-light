"use client";

import { usePageLoad } from "@/lib/usePageLoad";

/**
 * Initializes page load tracking on app startup.
 * This component does not render anything; it only sets up event listeners.
 */
export function PageLoadInitializer() {
  usePageLoad();
  return null;
}
