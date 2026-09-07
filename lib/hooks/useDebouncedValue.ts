"use client";

import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only updates after `value` has stayed
 * unchanged for `delay` ms. Every keystroke resets the timer, so rapid
 * typing produces a single downstream update once the user pauses.
 *
 * Equivalent in performance to lodash.debounce (both are just a
 * setTimeout/clearTimeout pair per change) without the extra dependency.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    // Cleanup cancels the pending update whenever `value` (or `delay`)
    // changes again — this is what makes rapid typing collapse into one
    // update.
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
