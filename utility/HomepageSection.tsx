"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Whether this environment can observe intersections at all.
 *
 * Expressed with `useSyncExternalStore` rather than a `useState` flipped from
 * the effect. An environment capability is exactly what that hook is for: it
 * takes a SEPARATE server snapshot, so SSR/hydration stays deterministic (a
 * server cannot know the client's capabilities) and React then switches to the
 * real client value WITHOUT a hydration mismatch.
 *
 * The two alternatives are both wrong here:
 *   - `setRevealed(true)` from the effect body cascades a render
 *     (`react-hooks/set-state-in-effect`);
 *   - adding the class to the DOM node directly is undone by the next
 *     reconciliation, which recomputes `className` from the state and would
 *     re-hide the section.
 */
const subscribeToNothing = () => () => {};
const canObserveSnapshot = () => typeof IntersectionObserver !== "undefined";

/**
 * Assume the observer exists on the server, so the server and the hydrating
 * client render the pre-animation state exactly as they always have. A browser
 * without IntersectionObserver corrects this immediately after hydration.
 */
const canObserveServerSnapshot = () => true;

/**
 * Shared section shell with a two-mode width system:
 *
 *  - default ("fluid"): full viewport width with proportional gutters
 *    (px-6 → md:px-12 → lg:px-20 → xl:px-[8.5vw]). Content grows with the
 *    viewport instead of being capped — at 1440px this is identical to the
 *    old 1600px-capped layout; at 1920px+ the page uses the whole screen.
 *
 *  - `bleed`: edge-to-edge. No gutters at all — for visuals that must touch
 *    the viewport edges (video, banner imagery). Text/CTAs inside a bleed
 *    section need their own gutter wrapper.
 *
 * A hard max-width is never imposed automatically. When content genuinely
 * benefits from a cap (dense link grids, long text columns), the consumer
 * opts in via `className` (e.g. the fullscreen menu's max-w-[1600px]).
 *
 * WHY THIS NO LONGER USES framer-motion
 *
 * This is the most-rendered component in the codebase — roughly 50 components
 * wrap their content in it, so its imports are on the critical path of nearly
 * every public page. The only thing it used the library for was a single
 * fade-up (opacity + 20% translate), triggered either on load or on scroll
 * into view. That is now a CSS keyframe (`reveal-visible` in app/globals.css)
 * plus an IntersectionObserver that flips one boolean.
 *
 * Behaviour that is deliberately preserved:
 *   - `animateOnLoad` reveals immediately instead of waiting for scroll;
 *   - the reveal fires ONCE and never re-hides (the observer disconnects);
 *   - the same easing and 2s duration.
 */
const HomepageSection = ({
  children,
  className,
  animateOnLoad = false,
  bleed = false,
  // Destructured EXPLICITLY so it cannot fall into `rest` — see the merged ref
  // below. React 19 passes `ref` as an ordinary prop to function components.
  ref: forwardedRef,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  animateOnLoad?: boolean;
  bleed?: boolean;
} & React.ComponentProps<"section">) => {
  const canObserve = useSyncExternalStore(
    subscribeToNothing,
    canObserveSnapshot,
    canObserveServerSnapshot,
  );
  /** Set only by the observer callback, never synchronously in the effect. */
  const [inView, setInView] = useState(false);

  // Revealed when the section animates on load, when the observer has seen it,
  // or when the environment cannot observe at all — in that last case the
  // content would otherwise stay at `opacity-0` forever.
  const revealed = animateOnLoad || inView || !canObserve;
  const observerTarget = useRef<HTMLElement | null>(null);

  /**
   * Merged ref: the observer needs the node, and the caller may need it too.
   *
   * This is not cosmetic. The observer used to own a private `ref` that was
   * spread alongside `{...rest}` — and because `ref` reaches a React 19 function
   * component as a normal prop, a caller's `ref` sat in `rest` and OVERRODE it.
   * The element then never reached the observer, the effect below bailed at its
   * null check, `revealed` stayed false, and the section rendered at
   * `opacity-0` FOREVER — invisible, but still laid out, hoverable and
   * clickable, since opacity does not disable pointer events. That is exactly
   * how the homepage carousel lost its images while staying interactive.
   *
   * Merging both refs is what makes the reveal independent of whether a caller
   * passes a ref.
   */
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      observerTarget.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        // RefObject<T | null> — assignable, and what useInView returns.
        (forwardedRef as React.RefObject<HTMLElement | null>).current = node;
      }
    },
    [forwardedRef],
  );

  useEffect(() => {
    // Nothing to observe: the section animates on load, or this environment has
    // no IntersectionObserver (in which case `revealed` is already true above).
    if (animateOnLoad || !canObserve) return;

    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          // Once, mirroring framer-motion's `viewport: { once: true }`.
          observer.disconnect();
        }
      },
      // Bottom margin so a section only counts as "in view" once it has
      // actually entered the viewport a little, not the instant its first
      // pixel crosses the edge.
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animateOnLoad, canObserve]);

  return (
    <section
      ref={setRefs}
      className={[
        revealed ? "reveal-visible" : "opacity-0",
        bleed ? "" : "mx-auto w-full px-6 md:px-12 lg:px-20 xl:px-[8.5vw]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </section>
  );
};

export default HomepageSection;
