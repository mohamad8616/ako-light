/** Constants shared by the ImageGalleryCarousel family. */

/** Custom cubic-bezier easing curve matching the rest of the site. */
export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Media query for touch / coarse-pointer devices (gates the cursor circle). */
export const POINTER_QUERY = "(hover: none), (pointer: coarse)";

/** Media query for the `lg` breakpoint (gates the lightbox). */
export const LG_BREAKPOINT_QUERY = "(min-width: 1024px)";

/** Standard slide width chain (used as the even-index half of `multiWidth`). */
export const DEFAULT_SLIDE_WIDTHS =
  "w-[60vw] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[23vw]";

/** Wider slide width chain (used as the odd-index half of `multiWidth`). */
export const DOUBLE_SLIDE_WIDTHS =
  "w-[120vw] sm:w-[90vw] md:w-[64vw] lg:w-[48vw] xl:w-[46vw]";

/** Default 4:5 portrait aspect ratio. */
export const DEFAULT_HEIGHT = "aspect-4/5";

/** Fixed-height chain for the multiWidth (alternating) layout. */
export const MULTI_HEIGHT = "h-[50vh] sm:h-[45vh] md:h-[60vh]";

/** Shared image hover-zoom transition. */
export const IMAGE_TRANSITION = `transition-transform duration-[1.3s] ease-[${EASE}] group-hover:scale-105`;

/** Shared dark overlay transition on hover. */
export const OVERLAY_TRANSITION =
  "transition-colors duration-600 group-hover:bg-black/15";

/** Gentle drift for the cursor circle's inner arrow. */
export const MAX_ICON_OFFSET = 20;
export const DRIFT_FACTOR = 0.3;
