/** Shared image hover-zoom tokens. */
export const IMAGE_ZOOM = {
  duration: 2500, // ms — single source of truth for image zoom duration
  easing: "cubic-bezier(0.22,1,0.36,1)",
  defaultScale: 105, // scale percentage on hover
} as const;

// Tailwind only generates classes it can see as string literals, so the
// duration / scale / easing values above are mapped to full literal class
// strings here. If IMAGE_ZOOM.duration ever changes, add the new literal
// (e.g. "duration-1000") to DURATION_CLASS below.
const DURATION_CLASS: Record<number, string> = {
  300: "duration-300",
  500: "duration-500",
  700: "duration-700",
  1000: "duration-1000",
  1500: "duration-1500",
  2000: "duration-2000",
  2500: "duration-2500",
};

/** Fallback: if a duration isn't in DURATION_CLASS, emit a literal
 *  `duration-${ms}` string that Tailwind v4 will still recognise as a
 *  valid transition-duration value (it will generate the CSS for it). */
const fallbackDuration = (ms: number) => `duration-${ms}`;

// Scale class mapping for 102 / 103 / 105
const SCALE_CLASS = {
  102: {
    group: "group-hover:scale-102",
    standalone: "hover:scale-102",
  },
  103: {
    group: "group-hover:scale-103",
    standalone: "hover:scale-103",
  },
  105: {
    group: "group-hover:scale-105",
    standalone: "hover:scale-105",
  },
} as const;

type ImageZoomOptions = {
  scale?: keyof typeof SCALE_CLASS;
  grayscale?: boolean;
  /** use `hover:` instead of `group-hover:` when the trigger is the root element */
  standalone?: boolean;
};

const EASING_CLASS = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export const imageZoomClass = ({
  scale = IMAGE_ZOOM.defaultScale,
  grayscale = false,
  standalone = false,
}: ImageZoomOptions = {}) =>
  [
    "object-cover",
    grayscale && "grayscale",
    "transition-transform",
    DURATION_CLASS[IMAGE_ZOOM.duration] ??
      fallbackDuration(IMAGE_ZOOM.duration),
    EASING_CLASS,
    standalone ? SCALE_CLASS[scale].standalone : SCALE_CLASS[scale].group,
  ]
    .filter(Boolean)
    .join(" ");
