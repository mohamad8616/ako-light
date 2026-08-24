# Fix cursor-circle offset in ImageGalleryCarousel

## Symptom
On `/about`, the white arrow circle that follows the mouse over the Image Gallery section renders up-left of the actual cursor with a constant gap instead of being centered on it.

## Root cause (verified)
Tailwind is **v4.3.3** (`node_modules/tailwindcss/package.json`, `@import "tailwindcss"` in `app/globals.css`). In v4, the classes `-translate-x-1/2 -translate-y-1/2` compile to the **standalone CSS `translate` property** — not `transform`. The element currently applies centering twice:

1. Class: `translate: -50% -50%` → shift of (-40px, -40px) on the `h-20 w-20` (80px) circle
2. Inline `style.transform`: `"translate(-50%, -50%) scale(…)"` → another (-40px, -40px)

Net effect: the circle's bottom-right corner touches the cursor point; the whole circle sits top-left of it — exactly the reported gap. (Inline `transform` does NOT override the v4 `translate` property; they are independent and stack.)

Ruled out: `framer-motion` ancestor transform breaking `position: fixed` — `HomepageSection`'s `motion.section` rests at no transform after its entrance, and the observed offset is constant, matching the double-translate math, not scroll-dependent displacement.

## Fix — single file edit: `components/about/ImageGalleryCarousel.tsx`

Center via ONE mechanism only, and use individual transform properties so the hover scale-pop stays anchored to the circle's center:

1. `circleStyle` (lines ~73–82) — replace the `transform` string-concat with standalone properties:
   ```tsx
   const circleStyle = {
     left: cursorPos.x,
     top: cursorPos.y,
     translate: "-50% -50%",
     scale: hovering ? 1 : 0,
     opacity: hovering ? 1 : 0,
     transition:
       "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), scale 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
   };
   ```
   (`translate` centers; `scale` animates about the default center origin, so no drift during the pop.)
2. Circle div className (line ~132) — delete `-translate-x-1/2 -translate-y-1/2`. Keep everything else (`pointer-events-none fixed z-50 hidden h-20 w-20 … md:flex … mix-blend-difference`) unchanged.

No state, handler, or touch-gating changes. No other files touched (this markup exists only here).

## Edge cases
- Before first `mousemove`, circle sits at viewport origin but invisible (`opacity: 0`) — pre-existing behavior, unchanged.
- Touch devices: circle not rendered (`isTouch` gate) — unchanged.
- `mix-blend-difference` / z-index / pointer-events unaffected by property swap.

## Validation
1. `npm run dev` → `/about`: circle is dead-centered under the cursor at every position over the section; scales/fades out cleanly on leave, back in on enter.
2. Drag/swipe the Embla carousel and confirm the circle doesn't intercept clicks.
3. `npm run lint` + `npx tsc --noEmit`: no new output beyond known baseline.
